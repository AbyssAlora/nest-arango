import { Injectable } from '@nestjs/common';
import {
  ArangoManager,
  ArangoRepository,
  InjectManager,
  InjectRepository,
} from 'nest-arango';
import { PersonEntity } from './entities/person.entity';

@Injectable()
export class TestService {
  @InjectManager()
  private readonly databaseManager: ArangoManager;
  @InjectRepository(PersonEntity)
  private readonly personRepository: ArangoRepository<PersonEntity>;

  getHello(): string {
    return 'Hello World!';
  }
}
