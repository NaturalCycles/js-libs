# BotDetectionService <Badge text="experimental" type="warning"/>

Allows to detect simple (non-sophisticated) bots.

Example usage:

```ts
import { BotDetectionService } from '@naturalcycles/js-lib'

const botDetectionService = new BotDetectionService()

botDetectionService.isBot() // true/false
botDetectionService.isCDP() // true/false
botDetectionService.getBotReason() // BotReason enum
```

## Demo

<script setup>
import {BotDetectionService} from "../packages/js-lib/src/browser";
const botDetectionService = new BotDetectionService()
</script>

<pre>
isBot: {{ botDetectionService.isBot() }}
isCDP: {{ botDetectionService.isCDP() }}
isBotOrCDP: {{ botDetectionService.isBotOrCDP() }}
botReason: {{ botDetectionService.getBotReason() || 'null' }}
</pre>
