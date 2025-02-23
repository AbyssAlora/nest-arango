# Changelog

## v0.4

- Changed the minimum supported `arangojs` version to 10
- Added support for Nest.js version 11
- Removed `ArangoRepository` methods `upsertWithAql` and `updateWithAql`
- Introduced `ArangoEdgeRepository`, which contains edge-related methods provided by the `arangojs` package - `edges`, `inEdges` and `outEdges`
- Changed parameter types for `ArangoRepository` methods `getDocumentCountBy`, `findOneBy`, `findManyBy` and `removeBy` to only accept an entity-like object, which brings proper IDE intellisense
- Changed `ArangoRepository` methods `saveAll`, `updateAll`, `replaceAll` and `removeAll` to return proper types based on the specified options.
