import { Injectable } from '@nestjs/common';
import { aql } from 'arangojs';
import { DocumentCollection, EdgeCollection } from 'arangojs/collections';
import { Cursor } from 'arangojs/cursors';
import {
  Document,
  DocumentMetadata,
  DocumentOperationFailure,
  DocumentSelector,
  ObjectWithDocumentKey,
} from 'arangojs/documents';
import { ArangoError } from 'arangojs/errors';
import { aqlConcat, aqlPart, generateFilters } from '../common';
import { DeepPartial } from '../common/deep-partial.type';
import { ArangoDocument } from '../documents/arango.document';
import { isDocumentOperationFailure } from '../errors';
import { EventListenerContext } from '../interfaces/event-listener-context.interface';
import {
  ArangoNewOldResult,
  DocumentExistsOptions,
  DocumentReplace,
  DocumentSave,
  DocumentsExistOptions,
  DocumentUpdate,
  DocumentUpsertUpdate,
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
import { ArangoManager } from '../manager';
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
export class ArangoRepository<T extends ArangoDocument> {
  protected readonly arangoManager: ArangoManager;
  protected readonly collection: DocumentCollection<T> & EdgeCollection<T>;

  private readonly targetMetadata: TypeMetadata;
  private readonly eventListeners:
    | Map<EventListenerType, EventListener<T>>
    | undefined;

  public get collectionName() {
    return this.targetMetadata.collection;
  }

  constructor(arangoManager: ArangoManager, target: T) {
    this.arangoManager = arangoManager;
    this.targetMetadata = TypeMetadataStorage.getMetadata(
      target.constructor.name,
    );
    this.eventListeners = EventListenerMetadataStorage.getMetadata(
      target.constructor.name,
    );
    this.collection = this.arangoManager.database.collection<T>(
      this.collectionName,
    );
  }

  getIdFor(_key: string): string {
    return `${this.collectionName}/${_key}`;
  }

  getKeyFrom(_id: string): string {
    return _id.split('/')[1];
  }

  async documentExists(
    key: DocumentSelector,
    documentExistsOptions: DocumentExistsOptions = {},
  ): Promise<boolean> {
    if (documentExistsOptions.transaction) {
      return await documentExistsOptions.transaction.step(() =>
        this.collection.documentExists(key),
      );
    } else {
      return await this.collection.documentExists(key, documentExistsOptions);
    }
  }

  async documentsExist(
    documents: DocumentSelector[],
    documentsExistOptions: DocumentsExistOptions = {},
  ): Promise<boolean[]> {
    const keys = documents.map((selector) => {
      const curSelector = selector as any;
      if (curSelector['_id']) return curSelector._id.split('/')[1];
      if (curSelector['_key']) return curSelector._key;
      const split = curSelector.split('/');
      if (split.length > 1) return split[1];
      return curSelector;
    });
    const aqlQuery = `
      FOR key IN @keys
        RETURN !IS_NULL(DOCUMENT(CONCAT('${this.collection.name}', '/', key)))
   `;
    const bindVars = { keys: keys };

    if (documentsExistOptions.transaction) {
      const cursor = await documentsExistOptions.transaction.step(() =>
        this.arangoManager.query<boolean>(aqlQuery, bindVars),
      );

      return await documentsExistOptions.transaction.step(() => cursor.all());
    } else {
      const cursor = await this.arangoManager.query<boolean>(
        aqlQuery,
        bindVars,
      );

      return await cursor.all();
    }
  }

  async getDocumentCountBy(
    bindVars: DeepPartial<T>,
    findManyByOptions: GetDocumentCountByOptions = {},
  ): Promise<number> {
    const filter = generateFilters(bindVars, 'd');

    const aqlQuery = `WITH ${this.collection.name} FOR d IN ${this.collection.name} ${filter} COLLECT WITH COUNT INTO length RETURN length`;

    if (findManyByOptions.transaction) {
      const cursor = await findManyByOptions.transaction.step(() =>
        this.arangoManager.query<number>(aqlQuery, bindVars),
      );

      return (
        (await findManyByOptions.transaction.step(() => cursor.next())) ?? 0
      );
    } else {
      const cursor = await this.arangoManager.query<number>(aqlQuery, bindVars);

      return (await cursor.next()) ?? 0;
    }
  }

  async findOne(
    key: DocumentSelector,
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
    bindVars: DeepPartial<T>,
    findOneByOptions: FindOneByOptions = {},
  ): Promise<Document<T> | undefined> {
    const filter = generateFilters(bindVars, 'd');

    const aqlQuery = `WITH ${this.collection.name} FOR d IN ${this.collection.name} ${filter} RETURN d`;

    if (findOneByOptions.transaction) {
      const cursor = await findOneByOptions.transaction.step(() =>
        this.arangoManager.query<Document<T>>(aqlQuery, bindVars),
      );

      return await findOneByOptions.transaction.step(() => cursor.next());
    } else {
      const cursor = await this.arangoManager.query<Document<T>>(
        aqlQuery,
        bindVars,
      );

      return await cursor.next();
    }
  }

  async findMany(
    keys: (string | ObjectWithDocumentKey)[],
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
    bindVars: DeepPartial<T>,
    findManyByOptions: FindManyByOptions = {},
  ): Promise<ResultList<T>> {
    const filter = generateFilters(bindVars, 'd');

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
        this.arangoManager.query<Document<T>>(aqlQuery, bindVars, {
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
      const cursor = await this.arangoManager.query<Document<T>>(
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
        this.arangoManager.query<Document<T>>(
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
      const cursor = await this.arangoManager.query<Document<T>>(
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
    document: DocumentSave<T>,
    saveOptions: SaveOptions<R> = {},
  ): Promise<Document<T> | undefined> {
    saveOptions = { emitEvents: true, ...saveOptions };

    let context: EventListenerContext<T, R>;
    if (saveOptions?.emitEvents) {
      context = {
        database: this.arangoManager.database,
        transaction: saveOptions?.transaction,
        info: {
          current: 0,
        },
        data: saveOptions?.data,
        repository: this,
      };

      await this.eventListeners
        ?.get(EventListenerType.BEFORE_SAVE)
        ?.call(document, context);
    }

    let newEntity: Document<T> | undefined;

    if (saveOptions.transaction) {
      newEntity = (
        await saveOptions.transaction.step(() =>
          this.collection.save(document as any, {
            returnNew: true,
          }),
        )
      ).new;
    } else {
      newEntity = (
        await this.collection.save(document as any, {
          returnNew: true,
        })
      ).new;
    }

    if (saveOptions?.emitEvents) {
      context!.new = newEntity;

      await this.eventListeners
        ?.get(EventListenerType.AFTER_SAVE)
        ?.call(document, context!);
    }

    return newEntity;
  }

  async saveAll<R = any>(
    documents: DocumentSave<T>[],
    saveAllOptions: SaveOptions<R> & { returnFailures: false },
  ): Promise<Document<T>[]>;

  async saveAll<R = any>(
    documents: DocumentSave<T>[],
    saveAllOptions?: SaveOptions<R> & { returnFailures: true },
  ): Promise<(Document<T> | DocumentOperationFailure)[]>;

  async saveAll<R = any>(
    documents: DocumentSave<T>[],
    saveAllOptions?: SaveOptions<R> & { returnFailures?: undefined },
  ): Promise<(Document<T> | DocumentOperationFailure)[]>;

  async saveAll<R = any>(
    documents: DocumentSave<T>[],
  ): Promise<(Document<T> | DocumentOperationFailure)[]>;

  async saveAll<R = any>(
    documents: DocumentSave<T>[],
    saveAllOptions?: SaveOptions<R> & { returnFailures?: boolean },
  ): Promise<(Document<T> | DocumentOperationFailure)[]> {
    const options = { returnFailures: true, ...saveAllOptions }; // Ensures default is `true`

    const results = await this.saveAllInternal(documents, options);

    return options.returnFailures
      ? results
      : results.filter(
          (item): item is Document<T> => !isDocumentOperationFailure(item),
        );
  }

  private async saveAllInternal<R = any>(
    documents: DocumentSave<T>[],
    saveAllOptions: SaveOptions<R> = {},
  ): Promise<(Document<T> | DocumentOperationFailure)[]> {
    saveAllOptions = { emitEvents: true, ...saveAllOptions };

    let context: EventListenerContext<T, R>;
    if (saveAllOptions?.emitEvents) {
      context = {
        database: this.arangoManager.database,
        transaction: saveAllOptions?.transaction,
        info: {
          current: 0,
        },
        data: saveAllOptions?.data,
        repository: this,
      };

      if (this.eventListeners?.get(EventListenerType.BEFORE_SAVE)) {
        await Promise.all(
          documents.map(async (document, index) => {
            context.info.current = index;
            await this.eventListeners
              ?.get(EventListenerType.BEFORE_SAVE)
              ?.call(document, context);
          }),
        );
      }
    }

    let result: (
      | (DocumentMetadata & {
          new?: Document<T>;
        })
      | DocumentOperationFailure
    )[];

    if (saveAllOptions.transaction) {
      result = await saveAllOptions.transaction.step(() => {
        return this.collection.saveAll(documents as any[], {
          returnNew: true,
        });
      });
    } else {
      result = await this.collection.saveAll(documents as any[], {
        returnNew: true,
      });
    }

    return Promise.all(
      result.map(async (document, index) => {
        if (!isDocumentOperationFailure(document)) {
          if (saveAllOptions?.emitEvents) {
            context.info.current = index;
            context.new = document.new;
            await this.eventListeners
              ?.get(EventListenerType.AFTER_SAVE)
              ?.call(document, context);
          }

          return document.new!;
        } else {
          return document;
        }
      }),
    );
  }

  async update<R = any>(
    document: DocumentUpdate<T>,
    updateOptions: UpdateOptions<R> = {},
  ): Promise<ArangoNewOldResult<Document<T> | undefined>> {
    updateOptions = {
      returnOld: true,
      emitEvents: true,
      ...updateOptions,
    };

    const { transaction, emitEvents, data, ...options } = updateOptions;

    let context: EventListenerContext<T, R>;
    if (emitEvents) {
      context = {
        database: this.arangoManager.database,
        transaction: transaction,
        info: {
          current: 0,
        },
        data: data,
        repository: this,
      };

      await this.eventListeners
        ?.get(EventListenerType.BEFORE_UPDATE)
        ?.call(document, context);
    }

    let result:
      | (DocumentMetadata & {
          new?: Document<T> | undefined;
          old?: Document<T> | undefined;
        })
      | undefined;

    if (transaction) {
      result = await transaction.step(() =>
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

      await this.eventListeners
        ?.get(EventListenerType.AFTER_UPDATE)
        ?.call(document, context!);
    }

    return new ArangoNewOldResult(result?.new, result?.old);
  }

  async updateAll<R = any>(
    documents: DocumentUpdate<T>[],
    updateAllOptions: UpdateOptions<R> & { returnFailures: false },
  ): Promise<ArangoNewOldResult<Document<T>>[]>;

  async updateAll<R = any>(
    documents: DocumentUpdate<T>[],
    updateAllOptions?: UpdateOptions<R> & { returnFailures: true },
  ): Promise<(ArangoNewOldResult<Document<T>> | DocumentOperationFailure)[]>;

  async updateAll<R = any>(
    documents: DocumentUpdate<T>[],
    updateAllOptions?: UpdateOptions<R> & { returnFailures?: undefined },
  ): Promise<(ArangoNewOldResult<Document<T>> | DocumentOperationFailure)[]>;

  async updateAll<R = any>(
    documents: DocumentUpdate<T>[],
  ): Promise<(ArangoNewOldResult<Document<T>> | DocumentOperationFailure)[]>;

  async updateAll<R = any>(
    documents: DocumentUpdate<T>[],
    updateAllOptions?: UpdateOptions<R> & { returnFailures?: boolean },
  ): Promise<(ArangoNewOldResult<Document<T>> | DocumentOperationFailure)[]> {
    const options = { returnFailures: true, ...updateAllOptions };

    const results = await this.updateAllInternal(documents, options);

    return options.returnFailures
      ? results
      : results.filter(
          (item): item is ArangoNewOldResult<Document<T>> =>
            !isDocumentOperationFailure(item),
        );
  }

  private async updateAllInternal<R = any>(
    documents: DocumentUpdate<T>[],
    updateAllOptions: UpdateOptions<R> = {},
  ): Promise<(ArangoNewOldResult<Document<T>> | DocumentOperationFailure)[]> {
    updateAllOptions = {
      returnOld: true,
      emitEvents: true,
      ...updateAllOptions,
    };

    let context: EventListenerContext<T, R>;
    if (updateAllOptions?.emitEvents) {
      context = {
        database: this.arangoManager.database,
        transaction: updateAllOptions?.transaction,
        info: {
          current: 0,
        },
        data: updateAllOptions?.data,
        repository: this,
      };

      if (this.eventListeners?.get(EventListenerType.BEFORE_UPDATE)) {
        await Promise.all(
          documents.map(async (document, index) => {
            context.info.current = index;
            await this.eventListeners
              ?.get(EventListenerType.BEFORE_UPDATE)
              ?.call(document, context);
          }),
        );
      }
    }

    let results: (
      | (DocumentMetadata & {
          new?: Document<T>;
          old?: Document<T>;
        })
      | DocumentOperationFailure
    )[];

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

    return await Promise.all(
      results.map(async (document, index) => {
        if (!isDocumentOperationFailure(document)) {
          if (updateAllOptions?.emitEvents) {
            context.new = document.new;
            context.old = document.old;
            context.info.current = index;
            await this.eventListeners
              ?.get(EventListenerType.AFTER_UPDATE)
              ?.call(document, context);
          }

          return new ArangoNewOldResult(document.new!, document.old!);
        } else {
          return document;
        }
      }),
    );
  }

  async replace<R = any>(
    selector: DocumentSelector,
    document: DocumentSave<T>,
    replaceOptions: ReplaceOptions<R> = {},
  ): Promise<ArangoNewOldResult<Document<T> | undefined>> {
    replaceOptions = { returnOld: true, emitEvents: true, ...replaceOptions };

    let context: EventListenerContext<T, R>;
    if (replaceOptions?.emitEvents) {
      context = {
        database: this.arangoManager.database,
        transaction: replaceOptions?.transaction,
        info: {
          current: 0,
        },
        data: replaceOptions?.data,
        repository: this,
      };

      await this.eventListeners
        ?.get(EventListenerType.BEFORE_REPLACE)
        ?.call(document, context);
    }

    let result: DocumentMetadata & {
      new?: Document<T> | undefined;
      old?: Document<T> | undefined;
    };

    if (replaceOptions.transaction) {
      result = await replaceOptions.transaction.step(() =>
        this.collection.replace(selector, document as any, {
          returnNew: true,
          ...replaceOptions,
        }),
      );
    } else {
      result = await this.collection.replace(selector, document as any, {
        returnNew: true,
        ...replaceOptions,
      });
    }

    if (replaceOptions?.emitEvents) {
      context!.new = result.new;
      context!.old = result.old;
      await this.eventListeners
        ?.get(EventListenerType.AFTER_REPLACE)
        ?.call(document, context!);
    }

    return new ArangoNewOldResult(result.new, result.old);
  }

  async replaceAll<R = any>(
    documents: DocumentReplace<T>[],
    replaceAllOptions: ReplaceOptions<R> & { returnFailures: false },
  ): Promise<ArangoNewOldResult<Document<T>>[]>;

  async replaceAll<R = any>(
    documents: DocumentReplace<T>[],
    replaceAllOptions?: ReplaceOptions<R> & { returnFailures: true },
  ): Promise<(ArangoNewOldResult<Document<T>> | DocumentOperationFailure)[]>;

  async replaceAll<R = any>(
    documents: DocumentReplace<T>[],
    replaceAllOptions?: ReplaceOptions<R> & { returnFailures?: undefined },
  ): Promise<(ArangoNewOldResult<Document<T>> | DocumentOperationFailure)[]>;

  async replaceAll<R = any>(
    documents: DocumentReplace<T>[],
  ): Promise<(ArangoNewOldResult<Document<T>> | DocumentOperationFailure)[]>;

  async replaceAll<R = any>(
    documents: DocumentReplace<T>[],
    replaceAllOptions?: ReplaceOptions<R> & { returnFailures?: boolean },
  ): Promise<(ArangoNewOldResult<Document<T>> | DocumentOperationFailure)[]> {
    const options = { returnFailures: true, ...replaceAllOptions };

    const results = await this.replaceAllInternal(documents, options);

    return options.returnFailures
      ? results
      : results.filter(
          (item): item is ArangoNewOldResult<Document<T>> =>
            !isDocumentOperationFailure(item),
        );
  }

  private async replaceAllInternal<R = any>(
    documents: DocumentReplace<T>[],
    replaceAllOptions: ReplaceOptions<R> = {},
  ): Promise<(ArangoNewOldResult<Document<T>> | DocumentOperationFailure)[]> {
    replaceAllOptions = {
      returnOld: true,
      emitEvents: true,
      ...replaceAllOptions,
    };

    let context: EventListenerContext<T, R>;
    if (replaceAllOptions?.emitEvents) {
      context = {
        database: this.arangoManager.database,
        transaction: replaceAllOptions?.transaction,
        info: {
          current: 0,
        },
        data: replaceAllOptions?.data,
        repository: this,
      };

      if (this.eventListeners?.get(EventListenerType.BEFORE_REPLACE)) {
        await Promise.all(
          documents.map(async (document, index) => {
            context.info.current = index;
            await this.eventListeners
              ?.get(EventListenerType.BEFORE_REPLACE)
              ?.call(document, context);
          }),
        );
      }
    }

    let results: (
      | (DocumentMetadata & {
          new?: Document<T>;
          old?: Document<T>;
        })
      | DocumentOperationFailure
    )[];

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

    return await Promise.all(
      results.map(async (document, index) => {
        if (!isDocumentOperationFailure(document)) {
          if (replaceAllOptions?.emitEvents) {
            context.new = document.new;
            context.old = document.old;
            context.info.current = index;

            await this.eventListeners
              ?.get(EventListenerType.AFTER_REPLACE)
              ?.call(document, context);
          }

          return new ArangoNewOldResult(document.new!, document.old!);
        } else {
          return document;
        }
      }),
    );
  }

  async upsert<R = any>(
    upsert: DeepPartial<T>,
    insert: DocumentSave<T>,
    update: DocumentUpsertUpdate<T>,
    upsertOptions: UpsertOptions<R> = {},
  ): Promise<ArangoNewOldResult<Document<T> | undefined>> {
    upsertOptions = {
      emitEvents: true,
      ...upsertOptions,
    };

    const { transaction, emitEvents, data, ...options } = upsertOptions;

    let context: EventListenerContext<T, R>;

    if (emitEvents) {
      context = {
        database: this.arangoManager.database,
        transaction: transaction,
        info: {
          current: 0,
        },
        data: data,
        repository: this,
      };

      await this.eventListeners
        ?.get(EventListenerType.BEFORE_SAVE)
        ?.call(insert, context);
      await this.eventListeners
        ?.get(EventListenerType.BEFORE_UPDATE)
        ?.call(update, context);
    }

    let result:
      | {
          new: Document<T>;
          old: Document<T> | undefined;
        }
      | undefined;

    let cursor: Cursor<{
      new: Document<T>;
      old: Document<T> | undefined;
    }>;

    const _aql = aqlConcat(
      aqlPart`WITH ${this.collection} `,
      aqlPart`UPSERT ${upsert} `,
      aqlPart`INSERT ${insert} `,
      aqlPart`UPDATE ${update} `,
      aqlPart`IN ${this.collection} `,
      `OPTIONS ${JSON.stringify(options)} `,
      `RETURN { 'new': NEW, 'old': OLD }`,
    );
    const aqlQuery = aql(_aql.templateStrings as any, ..._aql.args);

    if (transaction) {
      cursor = await transaction.step(() =>
        this.arangoManager.query<{
          new: Document<T>;
          old: Document<T> | undefined;
        }>(aqlQuery),
      );
      result = await transaction.step(() => cursor.next());
    } else {
      cursor = await this.arangoManager.query<{
        new: Document<T>;
        old: Document<T> | undefined;
      }>(aqlQuery);

      result = await cursor.next();
    }

    if (!result) {
      throw new ArangoError({
        code: 404,
        errorMessage: 'document not found',
        errorNum: 1202,
      });
    }

    if (emitEvents) {
      context!.new = result.new;
      context!.old = result.old;

      if (result.old) {
        await this.eventListeners
          ?.get(EventListenerType.AFTER_UPDATE)
          ?.call(update, context!);
      } else {
        await this.eventListeners
          ?.get(EventListenerType.AFTER_SAVE)
          ?.call(insert, context!);
      }
    }

    return new ArangoNewOldResult(result.new, result.old);
  }

  async remove<R = any>(
    key: DocumentSelector,
    removeOptions: RemoveOptions<R> = {},
  ): Promise<Document<T> | undefined> {
    removeOptions = {
      emitEvents: true,
      ...removeOptions,
    };

    let context: EventListenerContext<T, R>;
    if (removeOptions?.emitEvents) {
      context = {
        database: this.arangoManager.database,
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
      context!.old = result;

      await this.eventListeners
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
    bindVars: DeepPartial<T>,
    removeByOptions: RemoveOptions<R> = {},
  ): Promise<Document<T>[]> {
    removeByOptions = {
      emitEvents: true,
      ...removeByOptions,
    };

    const entries: [string, any][] = Object.entries(bindVars);
    if (entries?.length < 1) {
      throw new Error('No bindVars were specified!');
    }

    let context: EventListenerContext<T, R>;
    if (removeByOptions?.emitEvents) {
      context = {
        database: this.arangoManager.database,
        transaction: removeByOptions?.transaction,
        info: {
          current: 0,
        },
        data: removeByOptions?.data,
        repository: this,
      };
    }

    let results: Document<T>[];

    // const filter = entries
    //   ?.map<string>(([k]) => `FILTER d.${k} == @${k}`)
    //   .join(' ');

    const filter = generateFilters(bindVars, 'd');

    const aqlQuery = `WITH ${this.collection.name} FOR d IN ${this.collection.name} ${filter} REMOVE d IN ${this.collection.name} RETURN OLD`;

    if (removeByOptions.transaction) {
      const cursor = await removeByOptions.transaction.step(() =>
        this.arangoManager.query<Document<T>>(aqlQuery, bindVars),
      );
      results = await removeByOptions.transaction.step(() => cursor.all());
    } else {
      const cursor = await this.arangoManager.query<Document<T>>(
        aqlQuery,
        bindVars,
      );
      results = await cursor.all();
    }

    return await Promise.all(
      results.map(async (document, index) => {
        if (removeByOptions?.emitEvents) {
          context.old = document;
          context.info.current = index;
          await this.eventListeners
            ?.get(EventListenerType.AFTER_REMOVE)
            ?.call(document, context);
        }

        return document;
      }),
    );
  }

  async removeAll<R = any>(
    keys: (string | ObjectWithDocumentKey)[] & DocumentSelector[],
    removeAllOptions: RemoveOptions = {},
  ): Promise<(Document<T> | DocumentOperationFailure)[]> {
    removeAllOptions = {
      emitEvents: true,
      ...removeAllOptions,
    };

    let context: EventListenerContext<T, R>;
    if (removeAllOptions?.emitEvents) {
      context = {
        database: this.arangoManager.database,
        transaction: removeAllOptions?.transaction,
        info: {
          current: 0,
        },
        data: removeAllOptions?.data,
        repository: this,
      };
    }

    let results: (Document<T> | DocumentOperationFailure)[];

    if (removeAllOptions.transaction) {
      results = (
        await removeAllOptions.transaction.step(() =>
          this.collection.removeAll(keys, { returnOld: true }),
        )
      ).map((item) => {
        if (!isDocumentOperationFailure(item)) {
          return item.old!;
        } else {
          return item;
        }
      });
    } else {
      results = (
        await this.collection.removeAll(keys, { returnOld: true })
      ).map((item) => {
        if (!isDocumentOperationFailure(item)) {
          return item.old!;
        } else {
          return item;
        }
      });
    }

    return results.map((document, index) => {
      if (!isDocumentOperationFailure(document)) {
        if (removeAllOptions?.emitEvents) {
          context.old = document;
          context.info.current = index;
          this.eventListeners
            ?.get(EventListenerType.AFTER_REMOVE)
            ?.call(document, context);
        }
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

  create(document: T): T {
    const instance = new this.targetMetadata.constructor();
    return Object.assign(instance, document);
  }
}
