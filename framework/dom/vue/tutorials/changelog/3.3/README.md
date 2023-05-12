- `<script setup>` 的 defineProps 支持复杂的类型声明

    ps：在此之前只能使用本地字面量和接口类型，3.3 之后支持导入外部模块的类型，并且支持类型联合。

- `<script setup>` 支持泛型

    `<script setup lang="ts" generic="T extends string | number, U extends Item"></script>`

- `<script setup>` 的 defineEmits 支持 Interface 定义形式

    ```ts
    // before
    const emit = defineEmits<{
      (e: 'foo', id: number): void
      (e: 'bar', name: string, ...rest: any[]): void
    }>()

    // after
    const emit = defineEmits<{
      foo: [id: number]
      bar: [name: string, ...rest: any[]]
    }>()
    ```

- `<script setup>` 支持 defineSlots

    ```vue
    <script setup lang="ts">
    defineSlots<{
      default?: (props: { msg: string }) => any
      item?: (props: { id: number }) => any
    }>()
    </script>
    ```

- 增强的 `toRef` and `toValue`

    支持普通值、Getter、Refs

- `<script setup>` 支持 defineOptions

    ```vue
    <script setup>
    defineOptions({ inheritAttrs: false })
    </script>
    ```

- 新增实验性的特性 defineModel

    ```vue
    <!-- BEFORE -->
    <script setup>
    const props = defineProps(['modelValue'])
    const emit = defineEmits(['update:modelValue'])
    console.log(props.modelValue)

    function onInput(e) {
      emit('update:modelValue', e.target.value)
    }
    </script>

    <template>
      <input :value="modelValue" @input="onInput" />
    </template>
    ```

    ```vue
    <!-- AFTER -->
    <script setup>
    const modelValue = defineModel()
    console.log(modelValue.value)
    </script>

    <template>
      <input v-model="modelValue" />
    </template>
    ```


## 参考文献

- [Announcing Vue 3.3](https://blog.vuejs.org/posts/vue-3-3)
