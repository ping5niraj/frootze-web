import { useState } from 'react';
import html2canvas from 'html2canvas';

export default function ShareTree({ treeRef, userName, memberCount }) {
  const [capturing, setCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleCapture = async () => {
    if (!treeRef?.current) return;
    setCapturing(true);
    try {
      const canvas = await html2canvas(treeRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const branded = addBranding(canvas, userName, memberCount);
      const dataUrl = branded.toDataURL('image/png');
      setPreviewUrl(dataUrl);
      // Save to sessionStorage so AddRelative can use it for invites
      try { sessionStorage.setItem('pmf_tree_image', dataUrl); } catch(e) {}
      setShowModal(true);
    } catch (err) {
      console.error('Capture failed:', err);
      alert('Failed to capture tree. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const addBranding = (canvas, userName, memberCount) => {
    const branded = document.createElement('canvas');
    const padding = 40;
    const headerH = 80;
    const footerH = 70;
    branded.width = canvas.width + padding * 2;
    branded.height = canvas.height + headerH + footerH + padding * 2;
    const ctx = branded.getContext('2d');

    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(0, 0, branded.width, branded.height);

    const grad = ctx.createLinearGradient(0, 0, branded.width, headerH + padding);
    grad.addColorStop(0, '#7C3AED');
    grad.addColorStop(1, '#5B21B6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, branded.width, headerH + padding);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Inter, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🌳 frootze', padding, padding + 36);

    ctx.fillStyle = '#DDD6FE';
    ctx.font = '22px Inter, Arial, sans-serif';
    ctx.fillText(`${userName}'s Family Tree · ${memberCount} members`, padding, padding + 66);

    ctx.drawImage(canvas, padding, headerH + padding);

    const footerY = canvas.height + headerH + padding * 2;
    ctx.fillStyle = '#F5F3FF';
    ctx.fillRect(0, footerY - 10, branded.width, footerH + 10);
    ctx.fillStyle = '#C4B5FD';
    ctx.fillRect(0, footerY - 10, branded.width, 2);

    ctx.fillStyle = '#7C3AED';
    ctx.font = 'bold 20px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('உங்கள் குடும்ப மரத்தை உருவாக்க:', branded.width / 2, footerY + 20);

    ctx.fillStyle = '#5B21B6';
    ctx.font = 'bold 24px Inter, Arial, sans-serif';
    ctx.fillText('www.frootze.com', branded.width / 2, footerY + 50);

    return branded;
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `my-family-tree-frootze.png`;
    a.click();
  };

  const handleWhatsApp = () => {
    if (!previewUrl) return;
    handleDownload();
    const message = encodeURIComponent(
      `நான் எங்கள் குடும்ப மரத்தை உருவாக்கினேன்! 🌳\n\n` +
      `(I built our family tree!)\n\n` +
      `உங்கள் இடத்தை சேர்க்க இங்கே கிளிக் செய்யுங்கள்:\n` +
      `www.frootze.com\n\n` +
      `#frootze #FamilyTree #குடும்பம்`
    );
    setTimeout(() => window.open(`https://wa.me/?text=${message}`, '_blank'), 500);
  };

  return (
    <>
      <button onClick={handleCapture} disabled={capturing}
        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold text-base transition-all disabled:opacity-50">
        {capturing ? <>⏳ Capturing tree...</> : <>📤 என் குடும்ப மரத்தை பகிர் / Share My Family Tree</>}
      </button>

      {showModal && previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-purple-700 text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-lg">Your Family Tree</h3>
              <button onClick={() => { setShowModal(false); setPreviewUrl(null); }} className="text-purple-200 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-3 bg-gray-50">
              <img src={previewUrl} alt="Family Tree" className="w-full rounded-xl border border-purple-100" />
            </div>
            <div className="p-4 space-y-3">
              <button onClick={handleWhatsApp}
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition-all">
                <span className="text-xl">💬</span> Share on WhatsApp
              </button>
              <button onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition-all">
                <span className="text-xl">⬇️</span> Download Image
              </button>
              <button onClick={() => { setShowModal(false); setPreviewUrl(null); }}
                className="w-full text-gray-400 text-sm hover:text-gray-600 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
