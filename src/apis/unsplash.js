const maxPerPage = 30;
async function searchUnsplash(query, page = 1) {
  try {
    const response = await fetch("/unsplash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, page, per_page: maxPerPage }),
    });

    const { total, results } = await response.json();
    const resultsPerPage = Math.min(results.length, maxPerPage);

    const images = results.slice(0, resultsPerPage).map((result) => ({
      id: result.id,
      description: result.description,
      url: result.urls.small,
      download_location: result.links.download_location,
    }));

    if (response.status !== 200) throw new Error("Image search failed");

    // Return both images and total count
    return { images, total };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

async function downloadImg(url, fileName) {
  //fileName is xx.png
  try {
    const response = await fetch("/unsplash-download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        fileName: fileName,
      }),
    });
    const data = await response.json(); // { dimensions: { width, height, type } }

    // Show success message
    const successMsg = document.getElementById("success-message");
    successMsg.style.display = "block";
    setTimeout(() => (successMsg.style.display = "none"), 2000);

    // Return the dimensions so frontend can store them
    return data.dimensions;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

export { searchUnsplash, downloadImg };
