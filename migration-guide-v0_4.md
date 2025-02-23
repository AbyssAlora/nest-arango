# Migrating from previous versions to v0.4

Version 0.4 introduces some breaking changes

## ArangoRepository

- Removed methods `upsertWithAql` and `updateWithAql`.
  - These methods were originally created with the aim of wrapping simple raw UPSERT and UPDATE AQL queries with syntactic sugar, however as we continued to use these methods, we realized they were still missing "that one extra feature", which made us stop to think for a bit. This package was originally meant to be a simple driver that covers all the basic operations one might need. As such, we came to the conclusion that these methods are outside the scope of this package, and highly encourage using a raw query instead.
- Changed parameter types for methods `getDocumentCountBy`, `findOneBy`, `findManyBy` and `removeBy` to only accept an entity-like object, which brings proper IDE intellisense
  - If your method call shows an error related to a missing attribute, your entity is likely missing its definition. We recommend keeping all possible document properties as entity attributes.
- **Changed methods `saveAll`, `updateAll`, `replaceAll` and `removeAll` to return proper types.**
  - Each method now has multiple signatures with different expected options, and different return types.
  - By default, these methods return either a document, or `DocumentOperationFailure`, as specified in the new versions of `arangojs`.
  - In order to ignore potential operation failures, set the `returnFailures` option to `false`, otherwise it is expected that you handle resulting errors.

If you are getting unexpected behavior using `arangojs`-specific options that `nest-arango` utilizes, we recommend checking out the [**arangojs migration guide**](https://arangodb.github.io/arangojs/MIGRATING) for any breaking changes.
