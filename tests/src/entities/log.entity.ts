import {
  ArangoDocumentEdge,
  BeforeSave,
  BeforeUpdate,
  Collection,
} from 'nest-arango';

@Collection('Logs')
export class LogEntity extends ArangoDocumentEdge {
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
