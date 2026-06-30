# Context Index

Discovery hub for agents working on this repo. Read the file that matches your
task — do not read all files speculatively.

## File map

```
context/
├── INDEX.md                        ← this file
├── api/
│   └── fastedge-templates.md       ← templates endpoint schema, params type system, metadata encoding
└── development/
    └── action-patterns.md          ← how every action is structured, rollup, FastEdgeClient extension, testing
```

## Quick-ref

| Working on                                                               | Read                                                                  |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Adding or modifying the templates API layer (`src/api-utils/templates/`) | `context/api/fastedge-templates.md`                                   |
| Building a new action (new `src/<action>/` + `action.yml`)               | `context/development/action-patterns.md`                              |
| Understanding the template `params` field and `metadata` encoding        | `context/api/fastedge-templates.md` → "Params schema"                 |
| Extending `FastEdgeClient` with a new resource group                     | `context/development/action-patterns.md` → "FastEdgeClient extension" |
| Understanding change-detection and why it exists                         | `context/development/action-patterns.md` → "Change detection"         |
