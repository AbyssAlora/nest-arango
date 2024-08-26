import {
  AfterRemove,
  AfterReplace,
  AfterSave,
  AfterUpdate,
  ArangoDocument,
  BeforeReplace,
  BeforeSave,
  BeforeUpdate,
  Collection,
  EventListenerContext,
} from 'nest-arango';

@Collection('People')
export class PersonEntity extends ArangoDocument {
  name: string;
  email?: string;

  @BeforeUpdate()
  async beforeUpdate(context: EventListenerContext<PersonEntity>) {
    await context.repository.save(
      {
        _key: `beforeUpdate${context.data.order}`,
        name: `beforeUpdate${context.data.order}`,
      },
      { emitEvents: false },
    );
  }

  @AfterUpdate()
  async afterUpdate(context: EventListenerContext<PersonEntity>) {
    await context.repository.save(
      {
        _key: `afterUpdate${context.data.order}`,
        name: `afterUpdate${context.data.order}`,
      },
      { emitEvents: false },
    );
  }

  @BeforeSave()
  async beforeSave(context: EventListenerContext<PersonEntity>) {
    await context.repository.save(
      {
        _key: `beforeSave${context.data.order}`,
        name: `beforeSave${context.data.order}`,
      },
      { emitEvents: false },
    );
  }

  @AfterSave()
  async afterSave(context: EventListenerContext<PersonEntity>) {
    await context.repository.save(
      {
        _key: `afterSave${context.data.order}`,
        name: `afterSave${context.data.order}`,
      },
      { emitEvents: false },
    );
  }

  @BeforeReplace()
  async beforeReplace(context: EventListenerContext<PersonEntity>) {
    await context.repository.save(
      {
        _key: `beforeReplace${context.data.order}`,
        name: `beforeReplace${context.data.order}`,
      },
      { emitEvents: false },
    );
  }

  @AfterReplace()
  async afterReplace(context: EventListenerContext<PersonEntity>) {
    await context.repository.save(
      {
        _key: `afterReplace${context.data.order}`,
        name: `afterReplace${context.data.order}`,
      },
      { emitEvents: false },
    );
  }

  @AfterRemove()
  async afterRemove(context: EventListenerContext<PersonEntity>) {
    await context.repository.save(
      {
        _key: `afterRemove${context.data.order}`,
        name: `afterRemove${context.data.order}`,
      },
      { emitEvents: false },
    );
  }
}
