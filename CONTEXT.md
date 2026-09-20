# Personal Tech Blog

This context publishes a reviewed subset of the private robot knowledge base as a public, static technical blog.

## Language

**Source Note**:
A Markdown note in the private `robot-kb` repository. It is the only human-edited knowledge source.
_Avoid_: Blog post source, generated article

**Publication Set**:
The Source Notes explicitly marked `publish: true` and accepted by the export contract.
_Avoid_: Entire wiki, public folder

**Export Bundle**:
A deterministic, checksummed package containing only Published Articles and their transitive public resources.
_Avoid_: Backup, wiki copy

**Published Article**:
The sanitized public projection of one Source Note inside an Export Bundle.
_Avoid_: Source Note, page cache

**Public Slug**:
The stable canonical URL identifier of a Published Article.
_Avoid_: Filename, wiki path

**Alias**:
A former Public Slug retained as a permanent redirect to the canonical slug.
_Avoid_: Duplicate slug

**Public Link Graph**:
The outbound and backlink relationships among Published Articles only.
_Avoid_: Wiki graph

**Interactive Asset**:
A reviewed HTML teaching artifact executed in an opaque-origin sandboxed iframe.
_Avoid_: Inline script, embedded page

**Article Index**:
The generated `/data/articles.json` metadata and Public Link Graph consumed by the blog UI.
_Avoid_: Domain Fact Index, source of truth

**Domain Fact Index**:
A separate, future machine-queryable index proposed for robot-kb agents. It is not a blog input or authority.
_Avoid_: Article Index

**Sync PR**:
The single review gate through which an Export Bundle enters the public repository history.
_Avoid_: Manual content edit
