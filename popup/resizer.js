document.addEventListener("DOMContentLoaded", () => {
    // Observe DOM changes to wait for Vue to render
    const observer = new MutationObserver((mutations, obs) => {
        const inputGroup = document.querySelector(".input-group");
        if (!inputGroup) return;

        // Stop observing once found
        obs.disconnect();

        // Create the button
        const btn = document.createElement("button");
        btn.textContent = "Resize to 390×260";
        btn.style.display = "block";
        btn.style.marginTop = "8px";
        btn.style.padding = "6px";
        btn.style.width = "100%";

        btn.addEventListener("click", () => {
            const urlInput = inputGroup.querySelector("input");
            if (!urlInput) {
                alert("No image URL found!");
                return;
            }

            const url = urlInput.value;
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;

            img.onload = () => {
                const canvas = document.createElement("canvas");
                const targetWidth = 390;
                const targetHeight = 260;

                // Maintain aspect ratio
                const aspectRatio = img.width / img.height;
                let drawWidth = targetWidth;
                let drawHeight = targetHeight;

                if (targetWidth / targetHeight > aspectRatio) {
                    drawWidth = targetHeight * aspectRatio;
                } else {
                    drawHeight = targetWidth / aspectRatio;
                }

                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext("2d");
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";

                // Center the image in the canvas
                const offsetX = (targetWidth - drawWidth) / 2;
                const offsetY = (targetHeight - drawHeight) / 2;
                ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

                const resizedDataUrl = canvas.toDataURL("image/png");

                chrome.storage.local.set({ img: { url: resizedDataUrl, applied: true } }, () => {
                    console.log("Resized image saved to storage.");
                    alert("Image resized and applied!");
                });
            };

            img.onerror = () => {
                alert("Could not load image for resizing. Make sure the link is valid and supports CORS.");
            };
        });

        inputGroup.appendChild(btn);
    });

    observer.observe(document.body, { childList: true, subtree: true });
});
