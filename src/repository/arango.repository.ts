import { Injectable } from '@nestjs/common';
import { Database } from 'arangojs';
import { DocumentCollection, EdgeCollection } from 'arangojs/collection';
import { ArrayCursor } from 'arangojs/cursor';
import {
  Document,
  DocumentData,
  DocumentMetadata,
  DocumentSelector,
} from 'arangojs/documents';
import { ArangoError } from 'arangojs/error';
import { DeepPartial } from '../common/deep-partial.type';
import { ArangoDocumentEdge } from '../documents/arango-edge.document';
import { ArangoDocument } from '../documents/arango.document';
import { EventListenerContext } from '../interfaces/event-listener-context.interface';
import {
  DocumentUpdate,
  DocumentsFindMany,
  DocumentsFindOne,
  DocumentsReplaceAll,
  DocumentsUpdateAll,
  FindAllOptions,
  FindManyByOptions,
  FindManyOptions,
  FindOneByOptions,
  FindOneOptions,
  GetDocumentCountByOptions,
  RemoveOptions,
  ReplaceOptions,
  ResultList,
  SaveOptions,
  TruncateOptions,
  UpdateOptions,
  UpsertOptions,
} from '../interfaces/repository.types';
import { EventListenerMetadataStorage } from '../metadata/storages/event-metadata.storage';
import {
  TypeMetadata,
  TypeMetadataStorage,
} from '../metadata/storages/type-metadata.storage';
import {
  EventListener,
  EventListenerType,
} from '../metadata/types/listener.type';

@Injectable()
export class ArangoRepository<T extends ArangoDocument | ArangoDocumentEdge> {
  private readonly database: Database;
  private readonly targetMetadata: TypeMetadata;
  private readonly collection: DocumentCollection<T> & EdgeCollection<T>;
  private readonly eventListeners:
    | Map<EventListenerType, EventListener<T>>
    | undefined;

  public get collectionName() {
    return this.targetMetadata.collection;
  }

  constructor(database: Database, target: T) {
    this.database = database;
    this.targetMetadata = TypeMetadataStorage.getMetadata(
      target.constructor.name,
    );
    this.eventListeners = EventListenerMetadataStorage.getMetadata(
      target.constructor.name,
    );
    this.collection = this.database.collection<T>(this.collectionName);
  }

  getIdFor(_key: string): string {
    return `${this.collectionName}/${_key}`;
  }

  getKeyFrom(_id: string): string {
    return _id.split('/')[1];
  }

  async getDocumentCountBy(
    bindVars: Record<string, any>,
    findManyByOptions: GetDocumentCountByOptions = {},
  ): Promise<number> {
    const filter = Object.entries(bindVars)
      ?.map<string>(([k]) => `FILTER d.${k} == @${k}`)
      .join(' ');
    const aqlQuery = `WITH ${this.collection.name} FOR d IN ${this.collection.name} ${filter} COLLECT WITH COUNT INTO length RETURN length`;

    if (findManyByOptions.transaction) {
      const cursor = await findManyByOptions.transaction.step(() =>
        this.database.query<number>(aqlQuery, bindVars),
      );

      return (
        (await findManyByOptions.transaction.step(() => cursor.next())) ?? 0
      );
    } else {
      const cursor = await this.database.query<number>(aqlQuery, bindVars);

      return (await cursor.next()) ?? 0;
    }
  }

  async findOne(
    key: DocumentsFindOne,
    findOneOptions: FindOneOptions = {},
  ): Promise<Document<T> | undefined> {
    if (findOneOptions.transaction) {
      return await findOneOptions.transaction.step(() =>
        this.collection.document(key, { graceful: true }),
      );
    } else {
      return await this.collection.document(key, { graceful: true });
    }
  }

  async findOneBy(
    bindVars: Record<string, any>,
    findOneByOptions: FindOneByOptions = {},
  ): Promise<Document<T> | undefined> {
    const filter = Object.entries(bindVars)
      ?.map<string>(([k]) => `FILTER d.${k} == @${k}`)
      .join(' ');
    const aqlQuery = `WITH ${this.collection.name} FOR d IN ${this.collection.name} ${filter} RETURN d`;

    if (findOneByOptions.transaction) {
      const cursor = await findOneByOptions.transaction.step(() =>
        this.database.query<Document<T>>(aqlQuery, bindVars),
      );

      return await findOneByOptions.transaction.step(() => cursor.next());
    } else {
      const cursor = await this.database.query<Document<T>>(aqlQuery, bindVars);

      return await cursor.next();
    }
  }

  async findMany(
    keys: DocumentsFindMany,
    findManyOptions: FindManyOptions = {},
  ): Promise<Document<T>[]> {
    if (findManyOptions.transaction) {
      const docs = await findManyOptions.transaction.step(() =>
        this.collection.documents(keys),
      );

      return this.findManyInternal(docs);
    } else {
      return this.findManyInternal(await this.collection.documents(keys));
    }
  }

  private findManyInternal(docs: Document<T>[]): Document<T>[] {
    return docs.filter((doc: Document<T>) => {
      if ((doc as any).error) {
        return (doc as unknown as ArangoError).errorNum !== 1202;
      } else {
        return true;
      }
    });
  }

  async findManyBy(
    bindVars: Record<string, any>,
    findManyByOptions: FindManyByOptions = {},
  ): Promise<ResultList<T>> {
    const filter = Object.entries(bindVars)
      ?.map<string>(([k]) => `FILTER d.${k} == @${k}`)
      .join(' ');

    let limit = '';
    if (
      findManyByOptions.page !== undefined &&
      findManyByOptions.pageSize !== undefined
    ) {
      limit = `LIMIT ${
        findManyByOptions.page! * findManyByOptions.pageSize!
      }, ${findManyByOptions.pageSize!}`;
    }
    const sort = Object.entries(findManyByOptions.sort ?? {})
      ?.map<string>(([k, v]) => `SORT d.${k} ${v}`)
      .join(' ');

    const aqlQuery = `WITH ${this.collection.name} FOR d IN ${this.collection.name} ${filter} ${limit} ${sort} RETURN d`;

    if (findManyByOptions.transaction) {
      const cursor = await findManyByOptions.transaction.step(() =>
        this.database.query<Document<T>>(aqlQuery, bindVars, {
          fullCount: true,
        }),
      );
      const results = await findManyByOptions.transaction.step(() =>
        cursor.all(),
      );

      return {
        totalCount: cursor.extra.stats?.fullCount ?? results.length,
        results: results,
      };
    } else {
      const cursor = await this.database.query<Document<T>>(
        aqlQuery,
        bindVars,
        { fullCount: true },
      );
      const results = await cursor.all();

      return {
        totalCount: cursor.extra.stats?.fullCount ?? results.length,
        results: results,
      };
    }
  }

  async findAll(findAllOptions: FindAllOptions = {}): Promise<ResultList<T>> {
    let limit = '';
    if (
      findAllOptions.page !== undefined &&
      findAllOptions.pageSize !== undefined
    ) {
      limit = `LIMIT ${
        findAllOptions.page! * findAllOptions.pageSize!
      }, ${findAllOptions.pageSize!}`;
    }

    const sort = Object.entries(findAllOptions.sort ?? {})
      ?.map<string>(([k, v]) => `SORT d.${k} ${v}`)
      .join(' ');

    const aqlQuery = `WITH ${this.collection.name} FOR d IN ${this.collection.name} ${limit} ${sort} RETURN d`;

    if (findAllOptions.transaction) {
      const cursor = await findAllOptions.transaction.step(() =>
        this.database.query<Document<T>>(
          aqlQuery,
          {},
          {
            fullCount: true,
          },
        ),
      );
      const results = await findAllOptions.transaction.step(() => cursor.all());

      return {
        totalCount: cursor.extra.stats?.fullCount ?? results.length,
        results: results,
      };
    } else {
      const cursor = await this.database.query<Document<T>>(
        aqlQuery,
        {},
        { fullCount: true },
      );
      const results = await cursor.all();

      return {
        totalCount: cursor.extra.stats?.fullCount ?? results.length,
        results: results,
      };
    }
  }

  async save<R = any>(
    document: DeepPartial<T>,
    saveOptions: SaveOptions<R> = {},
  ): Promise<Document<T> | undefined> {
    saveOptions = { emitEvents: true, ...saveOptions };

    let context: EventListenerContext<T, R>;
    if (saveOptions?.emitEvents) {
      context = {
        database: this.database,
        transaction: saveOptions?.transaction,
        info: {
          current: 0,
        },
        data: saveOptions?.data,
        repository: this,
      };

      this.eventListeners
        ?.get(EventListenerType.BEFORE_SAVE)
        ?.call(document, context);
    }

    let newEntity: Document<T> | undefined;

    if (saveOptions.transaction) {
      newEntity = (
        await saveOptions.transaction.step(() =>
          this.collection.save(document as DocumentData<T>, {
            returnNew: true,
          }),
        )
      ).new;
    } else {
      newEntity = (
        await this.collection.save(document as DocumentData<T>, {
          returnNew: true,
        })
      ).new;
    }

    if (saveOptions?.emitEvents) {
      context!.new = newEntity;

      this.eventListeners
        ?.get(EventListenerType.AFTER_SAVE)
        ?.call(document, context!);
    }

    return newEntity;
  }

  async saveAll<R = any>(
    documents: DeepPartial<T>[],
    saveAllOptions: SaveOptions<R> = {},
  ): Promise<(Document<T> | undefined)[]> {
    saveAllOptions = { emitEvents: true, ...saveAllOptions };

    let context: EventListenerContext<T, R>;
    if (saveAllOptions?.emitEvents) {
      context = {
        database: this.database,
        transaction: saveAllOptions?.transaction,
        info: {
          current: 0,
        },
        data: saveAllOptions?.data,
        repository: this,
      };

      if (this.eventListeners?.get(EventListenerType.BEFORE_SAVE)) {
        documents.forEach((document, index) => {
          context.info.current = index;
          this.eventListeners
            ?.get(EventListenerType.BEFORE_SAVE)
            ?.call(document, context);
        });
      }
    }

    let result: (DocumentMetadata & {
      new?: Document<T> | undefined;
    })[];

    if (saveAllOptions.transaction) {
      result = await saveAllOptions.transaction.step(() => {
        return this.collection.saveAll(documents as T[], {
          returnNew: true,
        });
      });
    } else {
      result = await this.collection.saveAll(documents as T[], {
        returnNew: true,
      });
    }

    return result.map((document, index) => {
      if (saveAllOptions?.emitEvents) {
        context.info.current = index;
        context.new = document.new;
        this.eventListeners
          ?.get(EventListenerType.AFTER_SAVE)
          ?.call(document, context);
      }

      return document.new;
    });
  }

  async update<R = any>(
    document: DocumentUpdate<T>,
    updateOptions: UpdateOptions<R> = {},
  ): Promise<(Document<T> | undefined)[]> {
    updateOptions = { returnOld: true, emitEvents: true, ...updateOptions };

    let context: EventListenerContext<T, R>;
    if (updateOptions?.emitEvents) {
      context = {
        database: this.database,
        transaction: updateOptions?.transaction,
        info: {
          current: 0,
        },
        data: updateOptions?.data,
        repository: this,
      };

      this.eventListeners
        ?.get(EventListenerType.BEFORE_UPDATE)
        ?.call(document, context);
    }

    let result: DocumentMetadata & {
      new?: Document<T> | undefined;
      old?: Document<T> | undefined;
    };

    if (updateOptions.transaction) {
      result = await updateOptions.transaction.step(() =>
        this.collection.update(document, document, {
          returnNew: true,
          ...updateOptions,
        }),
      );
    } else {
      result = await this.collection.update(document, document, {
        returnNew: true,
        ...updateOptions,
      });
    }

    if (updateOptions?.emitEvents) {
      context!.new = result.new;
      context!.old = result.old;

      this.eventListeners
        ?.get(EventListenerType.AFTER_UPDATE)
        ?.call(document, context!);
    }

    return [result.new, result.old];
  }

  async updateAll<R = any>(
    documents: DocumentsUpdateAll<T>,
    updateAllOptions: UpdateOptions<R> = {},
  ): Promise<(Document<T> | undefined)[][]> {
    updateAllOptions = {
      returnOld: true,
      emitEvents: true,
      ...updateAllOptions,
    };

    let context: EventListenerContext<T, R>;
    if (updateAllOptions?.emitEvents) {
      context = {
        database: this.database,
        transaction: updateAllOptions?.transaction,
        info: {
          current: 0,
        },
        data: updateAllOptions?.data,
        repository: this,
      };

      if (this.eventListeners?.get(EventListenerType.BEFORE_UPDATE)) {
        documents.forEach((document, index) => {
          context.info.current = index;
          this.eventListeners
            ?.get(EventListenerType.BEFORE_UPDATE)
            ?.call(document, context);
        });
      }
    }

    let results: (DocumentMetadata & {
      new?: Document<T> | undefined;
      old?: Document<T> | undefined;
    })[];

    if (updateAllOptions.transaction) {
      results = await updateAllOptions.transaction.step(() =>
        this.collection.updateAll(documents, {
          returnNew: true,
          ...updateAllOptions,
        }),
      );
    } else {
      results = await this.collection.updateAll(documents, {
        returnNew: true,
        ...updateAllOptions,
      });
    }

    return results.map((item, index) => {
      if (updateAllOptions?.emitEvents) {
        context.new = item.new;
        context.old = item.old;
        context.info.current = index;
        this.eventListeners
          ?.get(EventListenerType.AFTER_UPDATE)
          ?.call(document, context);
      }

      return [item.new, item.old];
    });
  }

  async replace<R = any>(
    selector: DocumentSelector,
    document: DeepPartial<T>,
    replaceOptions: ReplaceOptions<R> = {},
  ): Promise<(Document<T> | undefined)[]> {
    replaceOptions = { returnOld: true, emitEvents: true, ...replaceOptions };

    let context: EventListenerContext<T, R>;
    if (replaceOptions?.emitEvents) {
      context = {
        database: this.database,
        transaction: replaceOptions?.transaction,
        info: {
          current: 0,
        },
        data: replaceOptions?.data,
        repository: this,
      };

      this.eventListeners
        ?.get(EventListenerType.BEFORE_REPLACE)
        ?.call(document, context);
    }

    let result: DocumentMetadata & {
      new?: Document<T> | undefined;
      old?: Document<T> | undefined;
    };

    if (replaceOptions.transaction) {
      result = await replaceOptions.transaction.step(() =>
        this.collection.replace(selector, document as DocumentData<T>, {
          returnNew: true,
          ...replaceOptions,
        }),
      );
    } else {
      result = await this.collection.replace(
        selector,
        document as DocumentData<T>,
        {
          returnNew: true,
          ...replaceOptions,
        },
      );
    }

    if (replaceOptions?.emitEvents) {
      context!.new = result.new;
      context!.old = result.old;
      this.eventListeners
        ?.get(EventListenerType.AFTER_REPLACE)
        ?.call(document, context!);
    }

    return [result.new, result.old];
  }

  async replaceAll<R = any>(
    documents: DocumentsReplaceAll<T>,
    replaceAllOptions: ReplaceOptions<R> = {},
  ): Promise<(Document<T> | undefined)[][]> {
    replaceAllOptions = {
      returnOld: true,
      emitEvents: true,
      ...replaceAllOptions,
    };

    let context: EventListenerContext<T, R>;
    if (replaceAllOptions?.emitEvents) {
      context = {
        database: this.database,
        transaction: replaceAllOptions?.transaction,
        info: {
          current: 0,
        },
        data: replaceAllOptions?.data,
        repository: this,
      };

      if (this.eventListeners?.get(EventListenerType.BEFORE_REPLACE)) {
        documents.forEach((document, index) => {
          context.info.current = index;
          this.eventListeners
            ?.get(EventListenerType.BEFORE_REPLACE)
            ?.call(document, context);
        });
      }
    }

    let results: (DocumentMetadata & {
      new?: Document<T> | undefined;
      old?: Document<T> | undefined;
    })[];

    if (replaceAllOptions.transaction) {
      results = await replaceAllOptions.transaction.step(() =>
        this.collection.replaceAll(documents as any, {
          returnNew: true,
          ...replaceAllOptions,
        }),
      );
    } else {
      results = await this.collection.replaceAll(documents as any, {
        returnNew: true,
        ...replaceAllOptions,
      });
    }

    return results.map((document, index) => {
      if (replaceAllOptions?.emitEvents) {
        context.new = document.new;
        context.old = document.old;
        context.info.current = index;

        this.eventListeners
          ?.get(EventListenerType.AFTER_REPLACE)
          ?.call(document, context);
      }

      return [document.new, document.old];
    });
  }

  async upsert<R = any>(
    upsert: DeepPartial<T>,
    insert: DeepPartial<T>,
    update: DeepPartial<T>,
    upsertOptions: UpsertOptions<R> = {},
  ): Promise<(Document<T> | undefined)[]> {
    upsertOptions = {
      emitEvents: true,
      ...upsertOptions,
    };

    let context: EventListenerContext<T, R>;

    if (upsertOptions?.emitEvents) {
      context = {
        database: this.database,
        transaction: upsertOptions?.transaction,
        info: {
          current: 0,
        },
        data: upsertOptions?.data,
        repository: this,
      };

      await this.eventListeners
        ?.get(EventListenerType.BEFORE_UPSERT)
        ?.call(update, context);
    }

    const aqlQuery = `
    WITH ${this.collectionName} 
    UPSERT @upsert 
    INSERT @insert 
    UPDATE @update IN ${this.collectionName} 
    RETURN { 'new': NEW, 'old': OLD }`;

    let result:
      | {
          new: Document<T>;
          old: Document<T> | undefined;
        }
      | undefined;

    let cursor: ArrayCursor<{
      new: Document<T>;
      old: Document<T> | undefined;
    }>;

    if (upsertOptions.transaction) {
      cursor = await upsertOptions.transaction.step(() =>
        this.database.query<{
          new: Document<T>;
          old: Document<T> | undefined;
        }>({
          query: aqlQuery,
          bindVars: {
            upsert: upsert,
            insert: insert,
            update: update,
          },
        }),
      );
      result = await upsertOptions.transaction.step(() => cursor.next());
    } else {
      cursor = await this.database.query<{
        new: Document<T>;
        old: Document<T>;
      }>({
        query: aqlQuery,
        bindVars: {
          upsert: upsert,
          insert: insert,
          update: update,
        },
      });

      result = await cursor.next();
    }

    if (upsertOptions?.emitEvents) {
      context!.new = result?.new;
      context!.old = result?.old;

      if (result?.old) {
        await this.eventListeners
          ?.get(EventListenerType.AFTER_UPDATE)
          ?.call(update, context!);
      } else {
        await this.eventListeners
          ?.get(EventListenerType.AFTER_SAVE)
          ?.call(insert, context!);
      }
    }

    return [result?.new, result?.old];
  }

  async remove<R = any>(
    key: DocumentSelector,
    removeOptions: RemoveOptions<R> = {},
  ): Promise<Document<T> | undefined> {
    let context: EventListenerContext<T, R>;
    if (removeOptions?.emitEvents) {
      context = {
        database: this.database,
        transaction: removeOptions?.transaction,
        info: {
          current: 0,
        },
        data: removeOptions?.data,
        repository: this,
      };
    }

    let result: Document<T> | undefined;
    if (removeOptions.transaction) {
      result = (
        await removeOptions.transaction.step(() =>
          this.collection.remove(key, { returnOld: true }),
        )
      ).old;
    } else {
      result = (await this.collection.remove(key, { returnOld: true })).old;
    }

    if (removeOptions?.emitEvents) {
      this.eventListeners
        ?.get(EventListenerType.AFTER_REMOVE)
        ?.call(result, context!);
    }

    return result;
  }

  /**
   * Removes documents containing matching fields with the provided bind variables.
   *
   * @remarks
   * This method does NOT emit the event that invokes `@BeforeRemove` decorated methods.
   */
  async removeBy<R = any>(
    bindVars: Record<string, any>,
    removeByOptions: RemoveOptions<R> = {},
  ): Promise<Document<T>[]> {
    const entries: [string, any][] = Object.entries(bindVars);
    if (entries?.length < 1) {
      throw new Error('No bindVars were specified!');
    }

    let context: EventListenerContext<T, R>;
    if (removeByOptions?.emitEvents) {
      context = {
        database: this.database,
        transaction: removeByOptions?.transaction,
        info: {
          current: 0,
        },
        data: removeByOptions?.data,
        repository: this,
      };
    }

    let results: Document<T>[];

    const filter = entries
      ?.map<string>(([k]) => `FILTER d.${k} == @${k}`)
      .join(' ');
    const aqlQuery = `WITH ${this.collection.name} FOR d IN ${this.collection.name} ${filter} REMOVE d IN ${this.collection.name} RETURN OLD`;

    if (removeByOptions.transaction) {
      const cursor = await removeByOptions.transaction.step(() =>
        this.database.query<Document<T>>(aqlQuery, bindVars),
      );
      results = await removeByOptions.transaction.step(() => cursor.all());
    } else {
      const cursor = await this.database.query<Document<T>>(aqlQuery, bindVars);
      results = await cursor.all();
    }

    return results.map((document, index) => {
      if (removeByOptions?.emitEvents) {
        context.old = document;
        context.info.current = index;
        this.eventListeners
          ?.get(EventListenerType.AFTER_REMOVE)
          ?.call(document, context);
      }

      return document;
    });
  }

  async removeAll<R = any>(
    keys: DocumentSelector[],
    removeAllOptions: RemoveOptions = {},
  ): Promise<(Document<T> | undefined)[]> {
    let context: EventListenerContext<T, R>;
    if (removeAllOptions?.emitEvents) {
      context = {
        database: this.database,
        transaction: removeAllOptions?.transaction,
        info: {
          current: 0,
        },
        data: removeAllOptions?.data,
        repository: this,
      };
    }

    let results: (Document<T> | undefined)[];

    if (removeAllOptions.transaction) {
      results = (
        await removeAllOptions.transaction.step(() =>
          this.collection.removeAll(keys, { returnOld: true }),
        )
      ).map((item) => {
        return item.old;
      });
    } else {
      results = (
        await this.collection.removeAll(keys, { returnOld: true })
      ).map((item) => {
        return item.old;
      });
    }

    return results.map((document, index) => {
      if (removeAllOptions?.emitEvents) {
        context.old = document;
        context.info.current = index;
        this.eventListeners
          ?.get(EventListenerType.AFTER_REMOVE)
          ?.call(document, context);
      }

      return document;
    });
  }

  async truncate(truncateOptions: TruncateOptions = {}): Promise<void> {
    if (truncateOptions.transaction) {
      await truncateOptions.transaction.step(() => this.collection.truncate());
    } else {
      await this.collection.truncate();
    }
  }
}
