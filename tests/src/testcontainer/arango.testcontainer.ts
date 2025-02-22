import {
  ArangoDBContainer as ArangoContainer,
  StartedArangoContainer as StartedArangoDBContainer,
} from '@testcontainers/arangodb';
import { Database } from 'arangojs';

const DATABASE = 'testing';

export class ArangoDBContainer extends ArangoContainer {
  constructor(image?: string, password?: string) {
    super(image, password);
  }

  public async start(): Promise<StartedArangoContainer> {
    const arangoContainer = await super.start();

    const db = new Database({
      url: arangoContainer.getHttpUrl(),
    });

    db.useBasicAuth(
      arangoContainer.getUsername(),
      arangoContainer.getPassword(),
    );
    await db.createDatabase(DATABASE);

    return new StartedArangoContainer(
      arangoContainer,
      arangoContainer.getPassword(),
      DATABASE,
    );
  }
}

export class StartedArangoContainer extends StartedArangoDBContainer {
  private readonly arangoContainer: StartedArangoDBContainer;
  private readonly database: string;

  constructor(
    startedArangoContainer: StartedArangoDBContainer,
    password: string,
    database: string,
  ) {
    super(startedArangoContainer, password);
    this.arangoContainer = startedArangoContainer;
    this.database = database;
  }

  getArangoHttpUrl(): string {
    return this.arangoContainer.getHttpUrl().replace(/[/]+$/, '');
  }

  getArangoUsername(): string {
    return this.arangoContainer.getUsername();
  }

  getArangoPassword(): string {
    return this.arangoContainer.getPassword();
  }

  getArangoDatabase(): string {
    return this.database;
  }

  setEnvironmentVariables() {
    process.env.ARANGO__URL = this.getArangoHttpUrl();
    process.env.ARANGO__USERNAME = this.getArangoUsername();
    process.env.ARANGO__PASSWORD = this.getArangoPassword();
    process.env.ARANGO__DATABASE = this.getArangoDatabase();
    process.env.ARANGO__REJECT_UNAUTHORIZED_CERT = 'false';
    return this;
  }
}
