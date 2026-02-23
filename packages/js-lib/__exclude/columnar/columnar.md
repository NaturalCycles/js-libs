
```
columns: [a, b, c]
```

A: indexed data storage:

```
data: [
  [1,2,3],
  [1,2], // empty tail
  [1,0,3], // empty token at second column
  [1,0,0,0,0,0,0,0,0,0,0,3], // severe case for A
  [1,2,3,4,5,6,7,8,9,10,11,12], // severe case for B
]
```

B: tagged data storage:

```
data: [
  [[0,1],[1,2],[2,3]],
  [[0,1],[1,2]], // instead of empty tail - absence of the tag
  [[0,1],[1,3]],
  [[0,1],[12,3], // severe case for A, but not for B
  [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[10,11],[11,12],[12,13], // severe case for B, but not for A
]
```

Two columnar storage formats:

A. Indexed: data index corresponds to the column index, starting from 0.
Needs a concept of empty token - some token that cannot appear in data.

B. Tagged: each data point is tag like [3, 'data'], where 3 is data index.
Emptiness concept if first-class, presented just as an absence of the tag.
Similar to protobuf.

C. Mixed A and B, optimized for each row

Columns can be defined/optimized per storage Bucket (array of Data),
or be hard-coded for a Table of data.

Columns (metadata) can either be shipped/stored together with data (most portable),
or stored separately (risk! if metadata is lost - data is almost 100% lost).
Absolutely safest is to store near-data. Which means it can be optimized near-data too,
per Bucket.


A is better when:
Average row, after empty-tail, has at least 80% of columns.

B is better when:
opposite of A criteria is true.
The 80% threshold can be refined, maybe it's not exactly 80%.
Tagged storage has [] tag wrapping overhead.
Index storage has "empty columns in the middle" overhead, and the need to interpret an empty token
(more transformation?).



Data types in JS (not all of them are part of json):
number | undefined
string | undefined
boolean | undefined
array of | []
object of | {}
map of // skip, advanced
set of // skip, advanced


TBD:
empty token? null? "" for strings, 0 or null for numbers,
what for undefined?

***

Alternatives:
Protobuf
Avro
FlatBuffers
MessagePack
