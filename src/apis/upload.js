import axios from "axios";

async function uploadFile(formData) {
  try {
    const { data } = await axios.post(
      "http://localhost:3000/upload",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );

    return {
      fileArr: data.files, // e.g. ["/uploads/img1.jpg", "/uploads/img2.png"]
      dimensionArr: data.dimensionArr,
    };
  } catch (err) {
    console.error("Upload failed:", err);
    alert(err.response?.data?.error || "Upload failed");
  }
}

export { uploadFile };
