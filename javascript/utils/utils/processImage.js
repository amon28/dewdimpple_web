  // Iterative downscaling function
export function downscaleImage(img, targetWidth, targetHeight, algorithm) {
    // Create a canvas with the original image dimensions
    let currentCanvas = document.createElement("canvas");
    currentCanvas.width = img.width;
    currentCanvas.height = img.height;
    let currentCtx = currentCanvas.getContext("2d");

    // Set smoothing settings based on chosen algorithm
    if (algorithm === "nearest") {
        currentCtx.imageSmoothingEnabled = false;
    } else {
        currentCtx.imageSmoothingEnabled = true;
        if (algorithm === "bilinear") {
            currentCtx.imageSmoothingQuality = "medium";
        } else if (algorithm === "bicubic") {
            currentCtx.imageSmoothingQuality = "high";
        }
    }
    currentCtx.drawImage(img, 0, 0);

    // Create an offscreen canvas for scaling
    let scalingCanvas = document.createElement("canvas");
    let scalingCtx = scalingCanvas.getContext("2d");

    // Iteratively scale down by 50% until near target dimensions
    while (currentCanvas.width * 0.5 > targetWidth && currentCanvas.height * 0.5 > targetHeight) {
        scalingCanvas.width = Math.floor(currentCanvas.width * 0.5);
        scalingCanvas.height = Math.floor(currentCanvas.height * 0.5);
        scalingCtx.imageSmoothingEnabled = (algorithm !== "nearest");
        if (algorithm !== "nearest") {
            if (algorithm === "bilinear") {
                scalingCtx.imageSmoothingQuality = "medium";
            } else if (algorithm === "bicubic") {
                scalingCtx.imageSmoothingQuality = "high";
            }
        }
        scalingCtx.drawImage(currentCanvas, 0, 0, scalingCanvas.width, scalingCanvas.height);

        // Copy the scaled image back to currentCanvas for the next iteration
        currentCanvas.width = scalingCanvas.width;
        currentCanvas.height = scalingCanvas.height;
        currentCtx = currentCanvas.getContext("2d");
        currentCtx.drawImage(scalingCanvas, 0, 0);
    }

    // Final draw to exact target size
    let finalCanvas = document.createElement("canvas");
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;
    let finalCtx = finalCanvas.getContext("2d");
    finalCtx.imageSmoothingEnabled = (algorithm !== "nearest");
    if (algorithm !== "nearest") {
        if (algorithm === "bilinear") {
            finalCtx.imageSmoothingQuality = "medium";
        } else if (algorithm === "bicubic") {
            finalCtx.imageSmoothingQuality = "high";
        }
    }
    finalCtx.drawImage(currentCanvas, 0, 0, targetWidth, targetHeight);

    return finalCanvas;
}