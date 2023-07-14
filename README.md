## Description

[ArangoDB](https://www.arangodb.com/docs/stable/) module for the [NestJS](https://nestjs.com/) framework built on top of [ArangoJS](https://www.npmjs.com/package/arangojs).

## Installation

In your existing NestJS-based project:

```
$ npm i --save nest-arango arangojs
```

## Quick Start

With the package installed, we can import `ArangoModule` into the root `AppModule`.

```typescript
import { ArangoModule } from 'nest-arango';

@Module({
  imports: [
    ArangoModule.forRoot({
      config: {
        url: 'http://localhost:8529',
        ...
      },
    }),
  ],
  ...
})
export class AppModule { }
```

Alternatively, if we need to inject environment variables into `ArangoModule`, we can use [configuration namespaces](https://docs.nestjs.com/techniques/configuration#configuration-namespaces) combined with the `forRootAsync()` method as shown below.

```typescript
// arango.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('arango', () => ({
  url: process.env.DATABASE__URL,
  password: process.env.DATABASE__PASSWORD,
}));
```

```typescript
// app.module.ts
import { ArangoModule } from 'nest-arango';
import arangoConfig from 'arango.config';

@Module({
  imports: [
    ConfigModule.forRoot(
    {
      load: [arangoConfig]
    }),
    ArangoModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        config: {
          url: configService.getOrThrow<string>('arango.url'),
          auth: {
            username: 'root',
            password: configService.getOrThrow<string>('arango.password'),
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  ...
})
export class AppModule { }
```

### Document entity definition

In ArangoDB, every record is a document stored in a collection. A collection can be defined as a collection of vertices or edges. We can define a document entity as shown below:

```typescript
import { Collection, ArangoDocument } from 'nest-arango';

@Collection('Users')
export class UserEntity extends ArangoDocument {
  username: string;
  email?: string;

  created_at?: Date;
  updated_at?: Date;
}
```

The `@Collection()` decorator defines the name of the collection containing documents like this one. **In ArangoDB, collection names are case-sensitive.**
Notice that `UserEntity` inherits from `ArangoDocument`. This type contains the standard metadata that ArangoDB uses (`_id`, `_key`, `_rev`). For edges, we can use the `ArangoDocumentEdge` type, which additionally includes edge metadata (`_from`, `to`). For more information about ArangoDB documents, refer to the official [ArangoDB Documentation](https://www.arangodb.com/docs/stable/data-modeling-documents-document-address.html).

### Arango Repository

`ArangoRepository` is a generic wrapper for [ArangoJS](https://www.npmjs.com/package/arangojs) methods that aims to simplify the usage of its CRUD methods, while adding some extra methods to fit our basic needs. To be able to inject the repository into our application, we need to extend `AppModule` from the earlier example with `ArangoModule.forFeature([...])` and register all the entities bound to document collections (see the example below).

```typescript
import { ArangoModule } from 'nest-arango';

@Module({
  imports: [
    ArangoModule.forRoot({
      config: {
        url: 'http://localhost:8529',
        ...
      },
    }),
    ArangoModule.forFeature([UserEntity])
  ],
  ...
})
export class AuthModule { }
```

Now we can inject the repository from inside of our service class using the `@InjectRepository()` decorator. As mentioned earlier, `ArangoRepository` is generic, so we need to pass the type of the entity to it. This type has to be registered in the `ArangoModule.forFeature([...])` call mentioned above. See the example below:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository, ArangoRepository } from 'nest-arango';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: ArangoRepository<UserEntity>
  ) {}
}
```

Now we can use all the repository methods.

### Arango Manager

`ArangoManager` is a simple utility class that holds the ArangoJS `Database` object reference, and contains a method for beginning transactions in a slightly more concise way. It is registered automatically within `ArangoModule`. To inject `ArangoManager`, we can use the `@InjectManager()` decorator:

```typescript
import { Injectable } from '@nestjs/common';
import { ArangoManager, InjectManager } from 'nest-arango';

@Injectable()
export class AppService {
  constructor(
    @InjectManager()
    private databaseManager: ArangoManager;
  ) {}
}
```

With `ArangoManager` injected, you can directly access the ArangoJS `Database` object and begin transactions.

### Transactions

There are two ways to work with transactions. The first is one is to begin the transaction through `ArangoManager` and define every step of the transaction by ourselves as described in the ArangoJS docs [here](https://arangodb.github.io/arangojs/latest/classes/_transaction_.transaction.html). Alternatively, we can pass the transaction reference directly to an `ArangoRepository` method to improve readability. These methods internally execute transaction steps. Below is an example of the latter approach.

```typescript
...

@Injectable()
export class AppService {
  constructor(
    @InjectManager()
    private databaseManager: ArangoManager,
    @InjectRepository(UserEntity)
    private readonly userRepository: ArangoRepository<UserEntity>,
    @InjectRepository(KnowsEntity)
    private readonly knowsRepository: ArangoRepository<KnowsEntity>,
  ) {}

  async executeInTransaction(user1: UserEntity, user2: UserEntity) {
    const trx = await this.databaseManager.beginTransaction({
      write: ['Knows']
    });

    try {
      // edge collection => [User -> Knows -> User]
      await this.knowsRepository.save(
        {
          _from: user1._id,
          _to: user2._id_
        },
        {
          transaction: trx
        }
      );
      await trx.commit();
    } catch (error) {
      await trx.abort();
    }
  }
}
```

### Event listeners

Event listeners are used to modify the entity before the execution of a select few `ArangoRepository` methods. Here is an example:

```typescript
import { BeforeSave } from 'nest-arango';

@Collection('Users')
export class UserEntity extends ArangoDocument {
  username: string;
  email?: string;

  created_at?: Date;
  updated_at?: Date;

  @BeforeSave()
  beforeSave() {
    this.created_at = new Date();
    this.updated_at = new Date();
  }
}
```

The `@BeforeSave()` decorator marks an entity method for execution when an entity is saved through `ArangoRepository`.

Currently available listeners:

1. `@BeforeSave()` - executes method before `save` and `saveAll`
2. `@BeforeUpdate()` - executes method before `update` and `updateAll`

### CLI migration tool

The `nest-arango` package also provides an experimental CLI tool to manage database migrations. We can directly use the `cli.js` provided within the package, but first we need to define a configuration file with the name `nest-arango.json` in your root folder. Here is an example:

```json
{
  "database": {
    "url": "http://localhost:8529",
    "databaseName": "env:ARANGO__DATABASE",
    "auth": {
      "username": "env:ARANGO__USERNAME",
      "password": "env:ARANGO__PASSWORD"
    },
    "agentOptions": {
      "rejectUnauthorized": "env:ARANGO__REJECT_UNAUTHORIZED_CERT:boolean"
    }
  },
  "migrationsCollection": "Migrations",
  "cli": {
    "migrationsDir": "migrations"
  }
}
```

- The `database` field has the same structure as the database configuration in `ArangoModule`. We can pass values as plain text, or we can provide a reference to an environment variable from our `.env` file. Optionally, we can also specify a type for the environment variable (see `rejectUnauthorized` in the example above). Currently, we can specify these types: `boolean` | `number` | `string`. By default, all variables are parsed as strings.
- The `migrationDir` field defines the directory where new migration scripts are created and read from.
- The `migrationsCollection` field specifies the name of the collection that will be created or read from in your database, and it is where the current migration state is being held. To work with migrations, we can use the following commands:

```console
branko@buzniç:~$ node /path/to/cli.js --create
branko@buzniç:~$ node /path/to/cli.js --run
branko@buzniç:~$ node /path/to/cli.js --revert
```

1. `--create` creates a migration TypeScript file inside `migrationsDir`
2. `--run` is used to run all the unapplied migrations from `migrationDir`
3. `--revert` reverts the last successfuly processed migration

Below is an example output of the **`--create`** migration command.

```typescript
import { Migration, Database } from 'nest-arango';

export class Migration1679387529350 implements Migration {
  async up(database: Database): Promise<void> {
    return;
  }

  async down(database: Database): Promise<void> {
    return;
  }
}
```

**Currently, there is no support for named migrations**. The migration uses a timestamp to ensure our migrations will run in the order of their creation. Inside the migration script, we can define what collections, indexes, views, graphs, etc. will be created or dropped when the migration is applied/reverted.

```typescript
import { Migration, Database } from 'nest-arango';

export class Migration1679387529350 implements Migration {
  async up(database: Database): Promise<void> {
    await database.createCollection('Users');
  }

  async down(database: Database): Promise<void> {
    await database.collection('Users').drop();
  }
}
```
