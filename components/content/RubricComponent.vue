<script setup lang="ts">
import { computed, ref } from 'vue'

const route = useRoute()

interface Props {
  id: string
}

const props = defineProps<Props>()

// Check if rubric should be hidden based on query parameter
const shouldShow = computed(() => {
  return route.query.hideRubric !== 'true'
})

// Only query the rubric data if it should be shown
const { data: rubric } = await useAsyncData(`rubric-component-${props.id}`, async () => {
  if (!shouldShow.value) {
    return null
  }
  return queryCollection('rubrics').path(`/rubrics/${props.id}`).first()
}, {
  watch: [shouldShow]
})
</script>

<template>
  <div v-if="rubric && shouldShow" class="border border-border rounded-lg my-8 p-4">
    <h3 class="pt-4 uppercase text-left text-lg pl-4 font-semibold text-foreground">
      {{ rubric.name }} Rubric
    </h3>
    <p v-if="rubric.description" class="pt-2 pb-6 px-4 text-left text-muted-foreground">
      {{ rubric.description }}
    </p>
    <div v-if="rubric.criteria && rubric.criteria.length > 0" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="text-left py-3 px-4 font-semibold text-foreground">Criterion</th>
            <th class="text-left py-3 px-4 font-semibold text-foreground">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(criterion, index) in rubric.criteria" 
            :key="index"
            class="border-b border-border last:border-0"
          >
            <td class="py-3 px-4 font-medium text-foreground">{{ criterion.name }}</td>
            <td class="py-3 px-4 text-muted-foreground">{{ criterion.description }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div v-else-if="shouldShow" class="my-8 p-4 rounded-lg border border-border bg-muted/30 text-muted-foreground">
    Rubric not found
  </div>
</template>
