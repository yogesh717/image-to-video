document.addEventListener('DOMContentLoaded', function () {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const imageUpload = document.getElementById('imageUpload');
  const audioUpload = document.getElementById('audioUpload');
  const generateButton = document.getElementById('generateButton');
  const resetButton = document.getElementById('resetButton');

  let recorder, audio, animationFrameId, startTime;
  const duration = 30;
  let images = [];
  let texts = [];
  let audioSource = null;
  let audioStream = null;

  // Load images
  imageUpload.addEventListener('change', (event) => {
    const files = event.target.files;
    images = [];
    Array.from(files).forEach(file => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => images.push(img);
    });
  });

  // Load audio
  audioUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      audio = new Audio(URL.createObjectURL(file));
      audio.loop = true; // Loop the audio to match the video duration
    }
  });

  // Add text block
  document.getElementById('addTextButton').addEventListener('click', () => {
    const container = document.createElement('div');
    container.classList.add('text-item', 'mb-4');
    container.innerHTML = `
      <label>Text:</label>
      <input type="text" class="form-control text-input" placeholder="Enter text">
      <label>Font:</label>
      <select class="form-select font-select">
        <option value="Arial">Arial</option>
        <option value="Verdana">Verdana</option>
        <option value="Courier New">Courier New</option>
        <option value="Georgia">Georgia</option>
      </select>
      <label>Font Size:</label>
      <input type="number" class="form-control font-size-input" value="60" min="20" max="200">
      <label>Text Color:</label>
      <input type="color" class="form-control text-color-input" value="#ffffff">
      <label>Text Animation:</label>
      <select class="form-select text-animation-select">
        <option value="none">None</option>
        <option value="text-slideIn">Slide In</option>
        <option value="text-fadeIn">Fade In</option>
        <option value="text-bounceIn">Bounce In</option>
      </select>
      <button class="btn btn-danger remove-text mt-2">Remove</button>`;
    document.getElementById('textSettings').appendChild(container);
  });

  // Remove text block
  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-text')) {
      event.target.parentElement.remove();
    }
  });

  // Generate video
  generateButton.addEventListener('click', () => {
    if (!images.length || !audio) {
      alert('Please upload both images and audio.');
      return;
    }

    texts = Array.from(document.querySelectorAll('.text-item')).map(item => ({
      text: item.querySelector('.text-input').value,
      font: item.querySelector('.font-select').value,
      fontSize: +item.querySelector('.font-size-input').value,
      color: item.querySelector('.text-color-input').value,
      animation: item.querySelector('.text-animation-select').value
    }));

    startRecording();
  });

  // Start recording
  function startRecording() {
    // Check if the audio has already been connected
    if (!audioSource) {
      const audioContext = new AudioContext();
      audioSource = audioContext.createMediaElementSource(audio);
      const destination = audioContext.createMediaStreamDestination();
      audioSource.connect(destination);
      audioStream = destination.stream;
    }

    const stream = canvas.captureStream(30);
    const combinedStream = new MediaStream([...stream.getTracks(), ...audioStream.getTracks()]);
    recorder = new RecordRTC(combinedStream, { type: 'video' });

    recorder.startRecording();
    audio.play();
    startTime = performance.now();
    animate();
  }

  // Animate canvas
  function animate() {
    const elapsed = (performance.now() - startTime) / 1000;
    const frameDuration = duration / images.length;
    const index = Math.floor(elapsed / frameDuration) % images.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(images[index], 0, 0, canvas.width, canvas.height);

    texts.forEach((t, i) => {
      ctx.font = `${t.fontSize}px ${t.font}`;
      ctx.fillStyle = t.color;

      // Apply animation to the text
      const animationClass = t.animation;
      ctx.save(); // Save the current state

      if (animationClass === 'text-slideIn') {
        const slideInX = Math.max(0, (elapsed - i * (duration / texts.length)) * 200);
        ctx.setTransform(1, 0, 0, 1, slideInX, 0);
      } else if (animationClass === 'text-fadeIn') {
        const opacity = Math.min(1, (elapsed - i * (duration / texts.length)) / 2);
        ctx.globalAlpha = opacity;
      } else if (animationClass === 'text-bounceIn') {
        const bounce = Math.sin(elapsed - i * (duration / texts.length)) * 20;
        ctx.translate(0, bounce);
      }

      ctx.fillText(t.text, 20, (i + 1) * t.fontSize * 1.5);

      ctx.restore(); // Restore to the original state
    });

    if (elapsed < duration) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      stopRecording();
    }
  }

  // Stop recording
  function stopRecording() {
    recorder.stopRecording(() => {
      const blob = recorder.getBlob();
      const url = URL.createObjectURL(blob);
      const video = document.createElement('video');
      video.src = url;
      video.controls = true;
      document.getElementById('previewContainer').append(video);

      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = 'reels_video.mp4';
      downloadLink.textContent = 'Download Video';
      document.getElementById('previewContainer').append(downloadLink);
    });
    audio.pause();
  }

  // Reset
  resetButton.addEventListener('click', () => {
    // Clear images, texts, and reset canvas
    images = [];
    texts = [];
    document.getElementById('textSettings').innerHTML = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('previewContainer').innerHTML = '';

    // Reset audio and streams
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    // Ensure to reset the audioSource and audioStream references
    audioSource = null;
    audioStream = null;
  });
});
