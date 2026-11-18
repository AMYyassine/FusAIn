<template>
  <div class="m-2">
    <!-- Search bar -->
    <div class="input-group my-3">
      <input
        type="text"
        class="form-control border-dark bg-transparent"
        placeholder="Search images..."
        @keyup="enterPressed"
        v-model="query"
      />
      <button type="button" class="btn btn-outline-dark" @click="search">
        Search
      </button>
    </div>

    <!-- Success message -->
    <div class="card m-1 p-1" id="success-message">
      Image added to list successfully!
    </div>

    <!-- Image list -->
    <div style="overflow-y: scroll; overflow-x: hidden; max-height: 100vh">
      <div class="row align-items-center bar">
        <img
          v-for="(image, index) in canvasStore.searchImgList"
          :key="index"
          @click="triggerImgDownload(index)"
          draggable="true"
          class="p-2 rounded-4 lh-sm d-flex w-100"
          :src="image.url"
          alt="search results"
          style="z-index: 100"
        />
      </div>
    </div>

    <!-- Pagination buttons -->
    <div class="d-flex justify-content-between align-items-center mt-3">
      <button
        type="button"
        class="btn btn-outline-secondary"
        @click="prevPage"
        :disabled="page === 1"
      >
        ← Previous
      </button>

      <span class="text-muted">Page {{ page }}</span>

      <button
        type="button"
        class="btn btn-outline-secondary"
        @click="nextPage"
        :disabled="page * 30 >= canvasStore.totalSearchResults"
      >
        Next →
      </button>
    </div>
  </div>
</template>

<script>
import { useCanvas } from "@/stores/canvasStore";

export default {
  name: "SearchResults",
  setup() {
    const canvasStore = useCanvas();
    return { canvasStore };
  },

  methods: {
    nextPage() {
      const totalPages = Math.ceil(this.canvasStore.totalSearchResults / 30);

      if (this.page < totalPages) {
        this.page++;
        this.search();
      }
    },

    prevPage() {
      if (this.page > 1) {
        this.page--;
        this.search();
      }
    },

    search() {
      this.canvasStore.doSearch(this.query, this.page);
    },

    enterPressed(evt) {
      const ENTER_KEY_CODE = 13;
      if (evt.keyCode === ENTER_KEY_CODE) {
        this.page = 1;
        this.search();
      }
    },

    triggerImgDownload(id) {
      this.canvasStore.imgDownload(id);
    },
  },

  data() {
    return { query: "", page: 1 };
  },
};
</script>

<style scoped>
.searchbar {
  width: 21vw;
  position: fixed;
  z-index: 10;
}
.bar {
  max-height: 70vh;
}
#success-message {
  display: none;
  color: green;
  position: fixed;
  z-index: 1000;
}
</style>
