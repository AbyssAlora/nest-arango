import {
  ArangoDocument,
  BeforeSave,
  BeforeUpdate,
  Collection,
} from 'nest-arango';

@Collection('People')
export class PersonEntity extends ArangoDocument {
  name: string;

  created_at?: Date;
  updated_at?: Date;

  @BeforeSave()
  beforeSave() {
    this.created_at = new Date();
    this.updated_at = new Date();
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updated_at = new Date();
  }
}
