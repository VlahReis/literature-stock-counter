export async function scanQr(video, onValue) {
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) return { supported: false };
  let stream;
  try {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    video.srcObject = stream; await video.play();
    let stopped = false;
    const stop = () => { stopped = true; stream.getTracks().forEach(track => track.stop()); video.srcObject = null; };
    const tick = async () => {
      if (stopped) return;
      try { const codes = await detector.detect(video); if (codes.length) { onValue(codes[0].rawValue); stop(); return; } } catch { /* Continue scanning the next frame. */ }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return { supported: true, stop };
  } catch (error) {
    stream?.getTracks().forEach(track => track.stop());
    return { supported: true, error };
  }
}
