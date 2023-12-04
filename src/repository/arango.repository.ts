import { Injectable } from '@nestjs/common';
import { Database, aql } from 'arangojs';
import { DocumentCollection, EdgeCollection } from 'arangojs/collection';
import {
  Document,
  DocumentData,
  DocumentSelector,
  ObjectWithKey,
} from 'arangojs/documents';
import { ArangoError } from 'arangojs/error';
import { aqlConcat, aqlPart, documentAQLBuilder } from '..';
import { DeepPartial } from '../common/deep-partial.type';
import { ArangoDocumentEdge } from '../documents/arango-edge.document';
import { ArangoDocument } from '../documents/arango.document';
import {
  DocumentReplace,
  DocumentSave,
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
import { EventListenerMetadataStorage } from '../metadata/storages/event-metadata.storage';
import {
  TypeMetadata,
  TypeMetadataStorage,
} from '../metadata/storages/type-metadata.storage';
import { EventListenerType } from '../metadata/types/listener.type';

@Injectable()
export class ArangoRepository<T extends ArangoDocument | ArangoDocumentEdge> {
  private readonly database: Database;
  private readonly targetMetadata: TypeMetadata;
  private readonly collection: DocumentCollection<T> & EdgeCollection<T>;
  private readonly eventListeners:
    | Map<EventListenerType, () => void>
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
    keys: (string | ObjectWithKey)[],
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
        this.database.query<Document<T>>(aqlQuery, bindVars),
      );
      const results = await findManyByOptions.transaction.step(() =>
        cursor.all(),
      );

      return {
        totalCount: cursor.extra.stats?.fullCount ?? results.length,
        results: results,
      };
    } else {
      const cursor = await this.database.query<Document<T>>(aqlQuery, bindVars);
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
        this.database.query<Document<T>>(aqlQuery),
      );
      const results = await findAllOptions.transaction.step(() => cursor.all());

      return {
        totalCount: cursor.extra.stats?.fullCount ?? results.length,
        results: results,
      };
    } else {
      const cursor = await this.database.query<Document<T>>(aqlQuery);
      const results = await cursor.all();

      return {
        totalCount: cursor.extra.stats?.fullCount ?? results.length,
        results: results,
      };
    }
  }

  async save(
    document: DocumentSave<T>,
    saveOptions: SaveOptions = {},
  ): Promise<Document<T> | undefined> {
    this.eventListeners?.get(EventListenerType.BEFORE_SAVE)?.call(document);

    if (saveOptions.transaction) {
      return (
        await saveOptions.transaction.step(() =>
          this.collection.save(document as any, {
            returnNew: true,
          }),
        )
      ).new;
    } else {
      return (
        await this.collection.save(document as any, {
          returnNew: true,
        })
      ).new;
    }
  }

  async saveAll(
    documents: DocumentSave<T>[],
    saveAllOptions: SaveOptions = {},
  ): Promise<(Document<T> | undefined)[]> {
    if (this.eventListeners?.get(EventListenerType.BEFORE_SAVE)) {
      documents.forEach((document) => {
        this.eventListeners?.get(EventListenerType.BEFORE_SAVE)?.call(document);
      });
    }

    if (saveAllOptions.transaction) {
      return (
        await saveAllOptions.transaction.step(() => {
          return this.collection.saveAll(documents as any[], {
            returnNew: true,
          });
        })
      ).map((item) => {
        return item.new;
      });
    } else {
      return (
        await this.collection.saveAll(documents as any[], {
          returnNew: true,
        })
      ).map((item) => {
        return item.new;
      });
    }
  }

  async update(
    document: DocumentUpdate<T>,
    updateOptions: UpdateOptions = {},
  ): Promise<(Document<T> | undefined)[]> {
    this.eventListeners?.get(EventListenerType.BEFORE_UPDATE)?.call(document);

    updateOptions = {
      returnOld: true,
      ...updateOptions,
    };

    if (updateOptions.transaction) {
      const result = await updateOptions.transaction.step(() =>
        this.collection.update(document, document, {
          returnNew: true,
          ...updateOptions,
        }),
      );

      return [result.new, result.old];
    } else {
      const result = await this.collection.update(document, document, {
        returnNew: true,
        ...updateOptions,
      });

      return [result.new, result.old];
    }
  }

  async updateAll(
    documents: DocumentUpdate<T>[],
    updateAllOptions: UpdateOptions = {},
  ): Promise<(Document<T> | undefined)[][]> {
    if (this.eventListeners?.get(EventListenerType.BEFORE_UPDATE)) {
      documents.forEach((document) => {
        this.eventListeners
          ?.get(EventListenerType.BEFORE_UPDATE)
          ?.call(document);
      });
    }
    updateAllOptions = {
      returnOld: true,
      ...updateAllOptions,
    };

    if (updateAllOptions.transaction) {
      const results = await updateAllOptions.transaction.step(() =>
        this.collection.updateAll(documents, {
          returnNew: true,
          ...updateAllOptions,
        }),
      );

      return results.map((item) => {
        return [item.new, item.old];
      });
    } else {
      const results = await this.collection.updateAll(documents, {
        returnNew: true,
        ...updateAllOptions,
      });

      return results.map((item) => {
        return [item.new, item.old];
      });
    }
  }

  async replace(
    selector: DocumentSelector,
    document: DocumentSave<T>,
    replaceOptions: ReplaceOptions = {},
  ): Promise<(Document<T> | undefined)[]> {
    this.eventListeners?.get(EventListenerType.BEFORE_UPDATE)?.call(document);

    replaceOptions = {
      returnOld: true,
      ...replaceOptions,
    };

    if (replaceOptions.transaction) {
      const result = await replaceOptions.transaction.step(() =>
        this.collection.replace(selector, document as DocumentData<T>, {
          returnNew: true,
          ...replaceOptions,
        }),
      );

      return [result.new, result.old];
    } else {
      const result = await this.collection.replace(
        selector,
        document as DocumentData<T>,
        {
          returnNew: true,
          ...replaceOptions,
        },
      );

      return [result.new, result.old];
    }
  }

  async replaceAll(
    documents: DocumentReplace<T>[],
    replaceAllOptions: ReplaceOptions = {},
  ): Promise<(Document<T> | undefined)[][]> {
    if (this.eventListeners?.get(EventListenerType.BEFORE_UPDATE)) {
      documents.forEach((document) => {
        this.eventListeners
          ?.get(EventListenerType.BEFORE_UPDATE)
          ?.call(document);
      });
    }

    replaceAllOptions = {
      returnOld: true,
      ...replaceAllOptions,
    };

    if (replaceAllOptions.transaction) {
      const results = await replaceAllOptions.transaction.step(() =>
        this.collection.replaceAll(documents as any, {
          returnNew: true,
          ...replaceAllOptions,
        }),
      );

      return results.map((item) => {
        return [item.new, item.old];
      });
    } else {
      const results = await this.collection.replaceAll(documents as any, {
        returnNew: true,
        ...replaceAllOptions,
      });

      return results.map((item) => {
        return [item.new, item.old];
      });
    }
  }

  async upsert(
    upsert: DeepPartial<T>,
    insert: DocumentSave<T>,
    update: DocumentUpsertUpdate<T>,
    upsertOptions: UpsertOptions = {},
  ): Promise<{
    totalCount: number;
    results: Document<T>[][];
  }> {
    this.eventListeners?.get(EventListenerType.BEFORE_SAVE)?.call(insert);
    this.eventListeners?.get(EventListenerType.BEFORE_UPDATE)?.call(update);

    const _aql = aqlConcat(
      aqlPart`WITH ${this.collection} UPSERT ${upsert} INSERT ${insert} UPDATE `,
      documentAQLBuilder(update),
      aqlPart` IN ${this.collection} RETURN { 'new': NEW, 'old': OLD }`,
    );
    const aqlQuery = aql(_aql.templateStrings as any, ..._aql.args);

    if (upsertOptions.transaction) {
      const cursor = await upsertOptions.transaction.step(() =>
        this.database.query<{
          new: Document<T>;
          old: Document<T>;
        }>(aqlQuery),
      );
      const results = await upsertOptions.transaction.step(() => cursor.all());

      return {
        totalCount: cursor.extra.stats?.fullCount ?? results.length,
        results: results.map((item) => [item.new, item.old]),
      };
    }

    const cursor = await this.database.query<{
      new: Document<T>;
      old: Document<T>;
    }>(aqlQuery);
    const results = await cursor.all();

    return {
      totalCount: cursor.extra.stats?.fullCount ?? results.length,
      results: results.map((item) => [item.new, item.old]),
    };
  }

  async remove(
    key: DocumentSelector,
    removeOptions: RemoveOptions = {},
  ): Promise<Document<T> | undefined> {
    if (removeOptions.transaction) {
      return (
        await removeOptions.transaction.step(() =>
          this.collection.remove(key, { returnOld: true }),
        )
      ).old;
    } else {
      return (await this.collection.remove(key, { returnOld: true })).old;
    }
  }

  async removeBy(
    bindVars: Record<string, any>,
    removeByOptions: RemoveOptions = {},
  ): Promise<Document<T>[]> {
    const entries: [string, any][] = Object.entries(bindVars);
    if (entries?.length < 1) {
      throw new Error('No bindVars were specified!');
    }
    const filter = entries
      ?.map<string>(([k]) => `FILTER d.${k} == @${k}`)
      .join(' ');
    const aqlQuery = `WITH ${this.collection.name} FOR d IN ${this.collection.name} ${filter} REMOVE d IN ${this.collection.name} RETURN OLD`;

    if (removeByOptions.transaction) {
      const cursor = await removeByOptions.transaction.step(() =>
        this.database.query<Document<T>>(aqlQuery, bindVars),
      );
      return await removeByOptions.transaction.step(() => cursor.all());
    } else {
      const cursor = await this.database.query<Document<T>>(aqlQuery, bindVars);
      return await cursor.all();
    }
  }

  async removeAll(
    keys: (string | ObjectWithKey)[] & DocumentSelector[],
    removeAllOptions: RemoveOptions = {},
  ): Promise<(Document<T> | undefined)[]> {
    if (removeAllOptions.transaction) {
      return (
        await removeAllOptions.transaction.step(() =>
          this.collection.removeAll(keys, { returnOld: true }),
        )
      ).map((item) => {
        return item.old;
      });
    } else {
      return (await this.collection.removeAll(keys, { returnOld: true })).map(
        (item) => {
          return item.old;
        },
      );
    }
  }

  async truncate(truncateOptions: TruncateOptions = {}): Promise<void> {
    if (truncateOptions.transaction) {
      await truncateOptions.transaction.step(() => this.collection.truncate());
    } else {
      await this.collection.truncate();
    }
  }
}
