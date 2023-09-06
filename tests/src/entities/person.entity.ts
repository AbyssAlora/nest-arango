import {
  AfterRemove,
  AfterReplace,
  AfterSave,
  AfterUpdate,
  ArangoDocument,
  BeforeReplace,
  BeforeSave,
  BeforeUpdate,
  BeforeUpsert,
  Collection,
  EventListenerContext,
} from 'nest-arango';

@Collection('People')
export class PersonEntity extends ArangoDocument {
  name: string;
  email?: string;

  @BeforeUpsert()
  async beforeUpsert(context: EventListenerContext) {
    await context.repository.save(
      {
        _key: `beforeUpsert${context.data.uuid}`,
        name: `beforeUpsert${context.data.uuid}`,
      },
      { emitEvents: false },
    );
  }

  @BeforeUpdate()
  async beforeUpdate(context: EventListenerContext) {
    await context.repository.save(
      {
        _key: `beforeUpdate${context.info.current}`,
        name: `beforeUpdate${context.info.current}`,
      },
      { emitEvents: false },
    );
  }

  @AfterUpdate()
  async afterUpdate(context: EventListenerContext) {
    await context.repository.save(
      {
        _key: `afterUpdate${context.info.current}`,
        name: `afterUpdate${context.info.current}`,
      },
      { emitEvents: false },
    );
  }

  @BeforeSave()
  async beforeSave(context: EventListenerContext) {
    await context.repository.save(
      {
        _key: `beforeSave${context.info.current}`,
        name: `beforeSave${context.info.current}`,
      },
      { emitEvents: false },
    );
  }

  @AfterSave()
  async afterSave(context: EventListenerContext) {
    await context.repository.save(
      {
        _key: `afterSave${context.info.current}`,
        name: `afterSave${context.info.current}`,
      },
      { emitEvents: false },
    );
  }

  @BeforeReplace()
  async beforeReplace(context: EventListenerContext) {
    await context.repository.save(
      {
        _key: `beforeReplace${context.info.current}`,
        name: `beforeReplace${context.info.current}`,
      },
      { emitEvents: false },
    );
  }

  @AfterReplace()
  async afterReplace(context: EventListenerContext) {
    await context.repository.save(
      {
        _key: `afterReplace${context.info.current}`,
        name: `afterReplace${context.info.current}`,
      },
      { emitEvents: false },
    );
  }

  @AfterRemove()
  async afterRemove(context: EventListenerContext) {
    await context.repository.save(
      {
        _key: `afterRemove${context.info.current}`,
        name: `afterRemove${context.info.current}`,
      },
      { emitEvents: false },
    );
  }
}
