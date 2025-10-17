<div id="top"></div>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h3 align="center">ABBA</h3>

  <p align="center">
    A tool for generating and persisting AB test assignments
    <br />
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#concepts">Concepts</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#segmentation">Segmentation</a></li>
    <li><a href="#experiment-status">Experiment / Assignment statuses</a></li>
    <li><a href="#exclusion">Mutual Exclusion</a></li>
  </ol>
</details>

<!-- CONCEPTS -->

## Concepts

- **Experiment:** An individual experiment that will test a hypothesis
- **Segmentation:** The target audience for the experiment
- **Sampling:** Restrictions on what proportion of the target audience will be involved in the
  experiment
- **Bucket:** An allocation that defines what variant of a particular experience the user will have
- **Start/End dates:** The timeframe that assignments will be generated for this experiment when
  active
- **Mutual Exclusion:**
  [See here](https://docs.developers.optimizely.com/full-stack-experimentation/docs/mutually-exclusive-experiments)

<!-- BUILTWITH -->

### Built With

- [@naturalcycles/db-lib](https://github.com/NaturalCycles/db-lib)

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

<div id="getting-started"></div>

### Prerequisites

<div id="prerequisites"></div>

- A running MYSQL instance

### Installation

<div id="installation"></div>

_Below is an example of how you can instruct your audience on installing and setting up your app.
This template doesn't rely on any external dependencies or services._

1. Install NPM packages<br/>

   ```sh
   yarn add @naturalcyles/abba

   or

   npm install @naturalcyles/abba
   ```

2. Install the schema into your MySQL db instance using the migration script found
   [here](https://github.com/NaturalCycles/js-libs/blob/main/packages/abba/src/migrations/init.sql).

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->

## Usage

<div id="usage"></div>

### Create an instance of Abba

(Currently supports MySQL, probably all DocumentDBs but not verified.)

```js
type AbbaConfig = {
  db: CommonDB // from @naturalcycles/db-lib
}

const abba = new Abba(config: AbbaConfig)
```

### Create a new experiment

Creates a new experiment

```js
async createExperiment(
	input: ExperimentInput,
	buckets: BucketInput[]
): Promise<Experiment>
```

### Update an experiment

Updates an existing experiment.

```js
async updateExperiment(
	id: number,
	input: ExperimentInput,
	buckets: BucketInput[]
): Promise<Experiment>
```

### Delete an experiment

Delete an experiment. Removes all users assignments and buckets

```js
async deleteExperiment(
	id: number
): Promise<void>
```

### Get all existing user assignments

Gets all existing user assignments

```js
async getAllExistingUserAssignments(
	userId: string
): Promise<UserAssignment[]>
```

### Get a users assignment

Get an assignment for a given user. If `existingOnly` is false, it will attempt generate a new
assignment. `segmentationData` becomse required when `existingOnly` is false

```js
async getUserAssignment(
  experimentId: number,
  userId: string,
  existingOnly: boolean,
  segmentationData?: SegmentationData,
): Promise<GeneratedUserAssignment | null>
```

### Generate user assignments

Generate user assignments for all active experiments. Will return any existing assignments and
attempt to generate new assignments.

```js
async generateUserAssignments(
  userId: string,
  segmentationData: SegmentationData,
): Promise<GeneratedUserAssignment[]>
```

### Getting assignment statistics

Get assignment statistics for an experiment.

```js
async getExperimentAssignmentStatistics(
  experimentId: number
): Promise<AssignmentStatistics>
```

<p align="right">(<a href="#top">back to top</a>)</p>

## Segmentation

<div id="segmentation"></div>

Experiments can be configured to target specific audiences using segmentation rules. When generating
assignments it is possible to test these rules using user segmentation data which is an object
containing key/value pairs unique to each user. A segmentation rule consist of the following
properties:

```js
  key: string, // the key of the corresponding segmentationData property.
  operator: SegmentationRuleOperator, // ('isSet' | 'isNotSet' | 'equalsText' | 'notEqualsText' | 'semver' | 'regex' | 'boolean' | 'greaterThan' | 'lessThan')
  value: string, // the value the operator will be executed against
```

## Segmentation rule operators

### SegmentationRuleOperator.IsSet

Rule:

```js
  { key: 'country', operator: 'isSet', value: '' }
```

Example segmentation data:

```js
{
  country: 'SE', // valid
  country: '' // not valid
  country: undefined // not valid
}
```

### SegmentationRuleOperator.IsNotSet

Rule:

```js
  { key: 'country', operator: 'isNotSet', value: '' }
```

Example segmentation data:

```js
{
  country: 'SE', // not valid
  country: '' // valid
  country: undefined // valid
}
```

### SegmentationRuleOperator.EqualsText

Rule:

```js
  { key: 'country', operator: 'equalsText', value: 'SE' }
```

Example segmentation data:

```js
{
  country: 'SE', // valid
  country: 'NO' // not valid
}
```

### SegmentationRuleOperator.NotEqualsText

Rule:

```js
  { key: 'country', operator: 'notEqualsText', value: 'SE' }
```

Example segmentation data:

```js
{
  country: 'NO', // valid
  country: 'SE' // not valid
}
```

### SegmentationRuleOperator.Boolean

Rule:

```js
  { key: 'isEligible', operator: 'boolean', value: true }
```

Example segmentation data:

```js
{
  isEligible: true, // valid
  isEligible: false // not valid
}
```

### SegmentationRuleOperator.Semver

Rule:

```js
  { key: 'appVersion', operator: 'semver', value: '>1.1.0' }
```

Example segmentation data:

```js
{
  appVersion: '1.2.0', // valid
  appVersion: '1' // not valid
}
```

### SegmentationRuleOperator.Regex

Rule:

```js
  { key: 'country', operator: 'regex', value: 'SE|NO' }
```

Example segmentation data:

```js
{
  country: 'SE', // valid
  country: 'NO', // valid
  country: 'GB' // not valid
}
```

### SegmentationRuleOperator.LessThan

Rule:

```js
  { key: 'registrationDate', operator: 'lessThan', value: '2021-01-11' }
```

Example segmentation data:

```js
{
  registrationDate: '2021-01-01', // valid
  registrationDate: '2022-01-01', // not valid

  // null and undefined is always invalid when using 'lessThan'
  registrationDate: null, // not valid
  registrationDate: undefined, // not valid
}
```

Rule:

```js
  { key: 'age', operator: 'lessThan', value: '18' }
```

Example segmentation data:

```js
{
  age: '17', // valid
  age: '19', // not valid
}
```

### SegmentationRuleOperator.GreaterThan

Rule:

```js
  { key: 'registrationDate', operator: 'greaterThan', value: '2021-01-11' }
```

Example segmentation data:

```js
{
  registrationDate: '2021-01-01', // not valid
  registrationDate: '2022-01-01', // valid

  // null and undefined is always invalid when using 'greaterThan'
  registrationDate: null, // not valid
  registrationDate: undefined, // not valid
}
```

Rule:

```js
  { key: 'age', operator: 'greaterThan', value: '18' }
```

Example segmentation data:

```js
{
  age: '17', // not valid
  age: '19', // valid
}
```

<p align="right">(<a href="#top">back to top</a>)</p>

<div id="exclusion"></div>

## Experiment Status

<div id="experiment-status"></div>

```js
export enum AssignmentStatus {
  /**
   * Will return existing assignments and generate new assignments
   */
  Active = 1,
  /**
   * Will return existing assignments but not generate new assignments
   */
  Paused = 2,
  /**
   * Will not return any assignments
   */
  Inactive = 3,
}
```

<p align="right">(<a href="#top">back to top</a>)</p>

## Mutual Exclusion

Mutual exclusion is configured per-experiment. If an experiment is listed as mutually exclusive with
another experiment(s) then new assignments will only be generated with one of the experiments and
will never be created for the other(s)

<p align="right">(<a href="#top">back to top</a>)</p>
