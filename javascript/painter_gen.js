import { downscaleImage } from './utils/processImage.js';
import './utils/design.js';

document.addEventListener("DOMContentLoaded", function () {
  const imageUpload = document.getElementById("imageUpload");
  const imageUrlInput = document.getElementById("imageUrl");
  const toggleImageSource = document.getElementById("toggleImageSource");
  const uploadSection = document.getElementById("uploadSection");
  const urlSection = document.getElementById("urlSection");
  const loadImageUrlBtn = document.getElementById("loadImageUrl");
  const progressBar = document.querySelector(".progress");
  const progressBarFill = document.querySelector(".progress-bar");
  const generatePaintBtn = document.getElementById("generatePaint");
  const outputLabel = document.getElementById("outputLabel");
  const copyButton = document.getElementById("copyButton");
  const clearButton = document.getElementById("clearButton");
  const actionButtons = document.getElementById("actionButtons");
  const imageComparison = document.getElementById("imageComparison");
  const originalPreview = document.getElementById("originalPreview");
  const resizedPreview = document.getElementById("resizedPreview");

  // New dropdowns for size and algorithm
  const sizeSelector = document.getElementById("sizeSelector");
  const resizeAlgorithm = document.getElementById("resizeAlgorithm");

  let uploadedImageDataUrl = null;
  // Tracks whether the loaded image came from a remote URL (needs CORS handling)
  // rather than the current state of the toggle switch, so it stays accurate
  // even if the user flips the toggle after loading an image.
  let isRemoteImage = false;

  function resetLoadedImage() {
    uploadedImageDataUrl = null;
    isRemoteImage = false;
    generatePaintBtn.disabled = true;
    outputLabel.textContent = "";
    actionButtons.style.display = "none";
    imageComparison.style.display = "none";
    originalPreview.innerHTML = "";
    resizedPreview.innerHTML = "";
    progressBar.style.display = "none";
  }

  // Toggle between file upload and URL input
  toggleImageSource.addEventListener("change", function () {
    if (this.checked) {
      uploadSection.style.display = "none";
      urlSection.style.display = "block";
      imageUpload.value = "";
    } else {
      uploadSection.style.display = "block";
      urlSection.style.display = "none";
      imageUrlInput.value = "";
    }
    // Whatever was loaded under the old mode no longer matches what's shown,
    // so clear it rather than risk generating from a stale image.
    resetLoadedImage();
  });

  // File upload event with progress update
  imageUpload.addEventListener("change", function (event) {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();

      // Clear previous data
      outputLabel.textContent = "";
      actionButtons.style.display = "none";
      imageComparison.style.display = "none";
      originalPreview.innerHTML = "";
      resizedPreview.innerHTML = "";

      progressBar.style.display = "block"; // Show progress bar

      reader.onprogress = function (e) {
        if (e.lengthComputable) {
          let percentLoaded = Math.round((e.loaded / e.total) * 100);
          progressBarFill.style.width = percentLoaded + "%";
          progressBarFill.textContent = percentLoaded + "%";
        }
      };

      reader.onerror = function () {
        alert("Couldn't read that file. Please try a different image.");
        progressBar.style.display = "none";
      };

      reader.onload = function (e) {
        uploadedImageDataUrl = e.target.result;
        isRemoteImage = false;
        originalPreview.innerHTML = "";
        const previewImg = document.createElement("img");
        previewImg.src = uploadedImageDataUrl;
        previewImg.className = "img-thumbnail";
        previewImg.style.maxWidth = "200px";
        originalPreview.appendChild(previewImg);
        generatePaintBtn.disabled = false; // Enable generate button

        progressBarFill.style.width = "100%";
        progressBarFill.textContent = "Upload Complete";
      };

      reader.readAsDataURL(file);
    }
  });

  // Load online image event
  loadImageUrlBtn.addEventListener("click", function () {
    const imageUrl = imageUrlInput.value.trim();
    if (!imageUrl) {
      alert("Please enter a valid image URL.");
      return;
    }
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Allow cross-origin images
    img.onload = function () {
      uploadedImageDataUrl = imageUrl;
      isRemoteImage = true;
      originalPreview.innerHTML = "";
      const previewImg = document.createElement("img");
      previewImg.src = uploadedImageDataUrl;
      previewImg.className = "img-thumbnail";
      previewImg.style.maxWidth = "200px";
      originalPreview.appendChild(previewImg);
      generatePaintBtn.disabled = false;
      alert("Image loaded successfully!");
    };
    img.onerror = function () {
      alert("Failed to load the image. Please check the URL.");
    };
    img.src = imageUrl;
  });

  // Generate paint event using iterative downscaling
  generatePaintBtn.addEventListener("click", function () {
    if (!uploadedImageDataUrl) return;

    const img = new Image();
    if (isRemoteImage) {
      img.crossOrigin = "Anonymous"; // Handle CORS for remote images
    }

    img.onload = function () {
      try {
        // Get target size from dropdown (e.g., 16 or 32)
        const targetSize = parseInt(sizeSelector.value, 10);

        // Use the iterative algorithm to downscale the image
        const downscaledCanvas = downscaleImage(img, targetSize, targetSize, resizeAlgorithm.value);

        // For preview, create a larger version while keeping pixelation
        const scaleFactor = 10; // adjust preview size if needed
        const scaledCanvas = document.createElement("canvas");
        scaledCanvas.width = targetSize * scaleFactor;
        scaledCanvas.height = targetSize * scaleFactor;
        const scaledCtx = scaledCanvas.getContext("2d");
        scaledCtx.imageSmoothingEnabled = false;
        scaledCtx.drawImage(downscaledCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

        // Show the resized image preview
        const resizedDataUrl = scaledCanvas.toDataURL();
        resizedPreview.innerHTML = "";
        const resizedImg = document.createElement("img");
        resizedImg.src = resizedDataUrl;
        resizedImg.className = "img-thumbnail";
        resizedImg.style.maxWidth = "300px";
        resizedPreview.appendChild(resizedImg);
        imageComparison.style.display = "flex";

        // Extract pixel data from the downscaled canvas
        const ctx = downscaledCanvas.getContext("2d");
        const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
        const data = imageData.data;

        let pixelArray = [];
        for (let y = 0; y < targetSize; y++) {
          let row = [];
          for (let x = 0; x < targetSize; x++) {
            let index = (y * targetSize + x) * 4;
            row.push({
              r: (data[index] / 255).toFixed(2),
              g: (data[index + 1] / 255).toFixed(2),
              b: (data[index + 2] / 255).toFixed(2),
              a: (data[index + 3] / 255).toFixed(2),
            });
          }
          pixelArray.push(row);
        }

        // Flip image data for correct orientation
        pixelArray.reverse();
        pixelArray.forEach(row => row.reverse());

        // Format output as a JavaScript array with resolution and return value
        let outputStr = "export function yourUniquePaintName() {\n";
        outputStr += "  const resolution = " + targetSize + ";\n";
        outputStr += "  const customImage = [\n";
        pixelArray.forEach(row => {
          let rowStr = row.map(pixel => `{ r: ${pixel.r}, g: ${pixel.g}, b: ${pixel.b}, a: ${pixel.a} }`).join(", ");
          outputStr += "      [" + rowStr + "],\n";
        });
        outputStr += "  ];\n";
        outputStr += "  return {customImage, resolution};\n";
        outputStr += "}\n";

        outputLabel.textContent = outputStr;
        actionButtons.style.display = "block"; // Show copy & clear buttons
      } catch (err) {
        console.error("Failed to generate paint:", err);
        alert(
          "Couldn't process this image. This usually happens when an online " +
          "image's server doesn't allow cross-origin access. Try downloading " +
          "the image and uploading it directly instead of using its URL."
        );
      }
    };

    img.onerror = function () {
      alert("Couldn't reload the image to generate paint. Please load it again.");
    };

    img.src = uploadedImageDataUrl;
  });

  // Copy to clipboard functionality
  copyButton.addEventListener("click", function () {
    navigator.clipboard.writeText(outputLabel.textContent)
      .then(() => alert("Copied to clipboard!"))
      .catch(() => alert("Couldn't copy automatically — please select and copy the output text manually."));
  });

  // Clear function to reset the app
  clearButton.addEventListener("click", function () {
    imageUpload.value = "";
    resetLoadedImage();
  });

  // Open Tutorial Modal
  document.getElementById("openTutorialBtn").addEventListener("click", function () {
    $("#tutorialModal").modal("show")
  });

  document.getElementById("content-links-btn").addEventListener('click', function() {
    $("#linksModal").modal("show")
  });
});
