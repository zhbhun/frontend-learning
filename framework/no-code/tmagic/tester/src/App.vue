<template>
  <div class="editor-app">
    <m-editor
      ref="editor"
      v-model="value"
      :menu="menu"
      :default-selected="defaultSelected"
      :runtime-url="runtimeUrl"
      :props-configs="propsConfigs"
      :props-values="propsValues"
      :event-method-list="eventMethodList"
      :moveable-options="moveableOptions"
      :auto-scroll-into-view="true"
      :component-group-list="componentGroupList"
      :stage-rect="stageRect"
    >
      <template #workspace-content>
        <device-group v-model="stageRect"></device-group>
      </template>
    </m-editor>
  </div>
</template>

<script>
import { defineComponent, ref } from "vue";
import { NodeType } from '@tmagic/schema';
import { asyncLoadJs } from "@tmagic/utils";
import componentGroupList from "./componentGroupList";
import dsl from "./dsl";

export default defineComponent({
  name: "App",
  setup() {
    const editor = ref();
    const value = ref(dsl);
    const stageRect = ref();
    const defaultSelected = ref(dsl.items[0].id);
    const propsValues = ref({}); // 组件默认值
    const propsConfigs = ref({}); // 组件属性列表
    const eventMethodList = ref({});

    asyncLoadJs("runtime/assets/config.js").then(() => {
      propsConfigs.value = window.magicPresetConfigs;
    });
    asyncLoadJs("runtime/assets/value.js").then(() => {
      propsValues.value = window.magicPresetValues;
    });
    asyncLoadJs("runtime/assets/event.js").then(() => {
      eventMethodList.value = window.magicPresetEvents;
    });

    const save = () => {
      // localStorage.setItem(
      //   "magicDSL",
      //   serialize(toRaw(value.value), {
      //     space: 2,
      //     unsafe: true,
      //   }).replace(/"(\w+)":\s/g, "$1: ")
      // );
      // editor.value?.editorService.resetModifiedNodeId();
    };

    const menu = {
      left: [
        {
          type: "text",
          text: "魔方",
        },
      ],
      center: ["delete", "undo", "redo", "guides", "rule", "zoom"],
      right: [
        // {
        //   type: "button",
        //   text: "Form Playground",
        //   handler: () => router.push("form"),
        // },
        // {
        //   type: "button",
        //   text: "Table Playground",
        //   handler: () => router.push("table"),
        // },
        // "/",
        // {
        //   type: "button",
        //   text: "预览",
        //   icon: Connection,
        //   handler: async (services) => {
        //     if (
        //       (services?.editorService.get < Map < Id,
        //       Id >> "modifiedNodeIds".size > 0)
        //     ) {
        //       try {
        //         await ElMessageBox.confirm(
        //           "有修改未保存，是否先保存再预览",
        //           "提示",
        //           {
        //             confirmButtonText: "保存并预览",
        //             cancelButtonText: "预览",
        //             type: "warning",
        //           }
        //         );
        //         save();
        //         ElMessage.success("保存成功");
        //       } catch (e) {
        //         console.error(e);
        //       }
        //     }
        //     previewVisible.value = true;
        //   },
        // },
        {
          type: "button",
          text: "保存",
          // icon: Coin,
          handler: () => {
            save();
            // ElMessage.success("保存成功");
          },
        },
        "/",
        // {
        //   type: "button",
        //   icon: Document,
        //   tooltip: "源码",
        //   handler: (service) =>
        //     service?.uiService.set(
        //       "showSrc",
        //       !service?.uiService.get("showSrc")
        //     ),
        // },
      ],
    };

    return {
      editor,
      menu,
      stageRect,
      value,
      defaultSelected,
      runtimeUrl: "/runtime/playground.html",
      propsConfigs,
      propsValues,
      eventMethodList,
      componentGroupList,
      moveableOptions: (core) => {
        const options = {};
        const id = core?.dr?.target?.id;

        if (!id || !editor.value) return options;

        const node = editor.value.editorService.getNodeById(id);

        if (!node) return options;

        const isPage = node.type === NodeType.PAGE;

        options.draggable = !isPage;
        options.resizable = !isPage;
        options.rotatable = !isPage;

        return options;
      },
    };
  },
});
</script>

<style lang="css">
body {
  margin: 0;
  height: 100vh;
}
#app {
  width: 100%;
  height: 100%;
  display: flex;
}

.m-editor {
  flex: 1;
  height: 100%;
}
</style>
