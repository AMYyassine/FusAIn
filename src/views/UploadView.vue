<script>
import InspiringElement from "@/components/inspiringElement.vue";
import { useCanvas } from "@/stores/canvasStore";
import { ref } from "vue";
import SearchResults from "@/components/SearchResults.vue";
export default {
  name: "UploadView",
  components: {
    SearchResults,
    InspiringElement,
  },

  setup() {
    const canvasStore = useCanvas();
    const draggable = true;
    const throttleDrag = 1;
    const edgeDraggable = false;
    const startDragRotate = 0;
    const throttleDragRotate = 0;
    const targetRef = ref(null);
    let isDrawing = false;
    let points = [];
    let imgData = null;

    return {
      targetRef,
      draggable,
      throttleDrag,
      edgeDraggable,
      startDragRotate,
      throttleDragRotate,
      canvasStore,
      isDrawing,
      points,
      imgData,
    };
  },
  data() {
    return {
      palette: [],
    };
  },
  emits: [
    "onOpenCanvasClick",
    "onColourOnDrag",
    "onDragCanvas",
    "onStoreImageTrackCoord",
    "onDecideObject",
    "onSubmitFile",
    "onCallDragStartCanvas",
    "onDragEnd",
  ],
  methods: {
    backToImgList() {
      this.canvasStore.imgSource = 0;
    },
    selectFile(event) {
      const files = event.target.files; // files are here
      console.log(files);

      if (files.length > 0) {
        this.canvasStore.imgSource = 0;
        this.canvasStore.selectFile(files);
      }
    },
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    async submitFile() {
      this.$emit("onSubmitFile");
    },
  },
  updated() {},
};
</script>
<template>
  <!-- Outer wrapper: full viewport height -->
  <div style="height: 100vh; display: flex; flex-direction: column">
    <!-- Top bar with buttons (fixed height) -->
    <div
      class="d-flex justify-content-center align-items-center p-2 bg-transparent"
    >
      <button
        v-show="canvasStore.imgSource === 1"
        class="btn btn-light mx-2"
        @click="backToImgList"
      >
        <font-awesome-icon icon="fa-solid fa-arrow-left" />
      </button>
      <button class="btn btn-light mx-2" @click="triggerFileInput">
        <font-awesome-icon icon="fa-solid fa-upload" />
      </button>

      <input
        type="file"
        ref="fileInput"
        multiple
        style="display: none"
        @change="selectFile"
      />

      <button class="btn btn-light mx-2" @click="canvasStore.imgSource = 1">
        <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
      </button>
    </div>

    <!-- Main content area: scrollable -->
    <div style="flex: 1; overflow-y: auto; position: relative">
      <!-- InspiringElement uploads -->
      <div v-show="canvasStore.imgSource === 0">
        <InspiringElement
          v-for="(object, index) of canvasStore.imageObjectList"
          :key="index"
          :source="object.url"
          :w="object.w"
          :h="object.h"
          :id="index"
          style="top: 12vh"
        />
      </div>

      <!-- SearchResults -->
      <div v-show="canvasStore.imgSource === 1">
        <SearchResults />
      </div>
    </div>
  </div>
</template>

<style></style>
