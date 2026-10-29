import React, { useState, useRef } from 'react';
import { Send, ImagePlus, X, AlertCircle, CheckCircle2, Loader2, Heart } from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface MessageFormProps {
  onSuccess?: () => void;
}

export const MessageForm: React.FC<MessageFormProps> = ({ onSuccess }) => {
  const [authorName, setAuthorName] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; preview: string; serverPath?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    if (photos.length + selectedFiles.length > 3) {
      setErrorMessage('Você pode anexar no máximo 3 fotografias.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

    for (const file of selectedFiles) {
      if (!validTypes.includes(file.type)) {
        setErrorMessage('Formato não permitido. Envie apenas imagens JPG, PNG ou WebP.');
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        setErrorMessage(`A imagem "${file.name}" ultrapassa o limite de 4 MB.`);
        return;
      }
    }

    const newPhotos = selectedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!authorName.trim()) {
      setErrorMessage('Por favor, informe seu nome.');
      return;
    }
    if (authorName.trim().length > 60) {
      setErrorMessage('O nome não pode exceder 60 caracteres.');
      return;
    }
    if (message.trim().length < 5) {
      setErrorMessage('Seu recado deve ter pelo menos 5 caracteres.');
      return;
    }
    if (message.trim().length > 1000) {
      setErrorMessage('O recado não pode ultrapassar 1.000 caracteres.');
      return;
    }
    if (!consent) {
      setErrorMessage('É necessário confirmar o consentimento para publicação.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload photos first if any
      const uploadedPaths: string[] = [];
      for (const item of photos) {
        if (item.serverPath) {
          uploadedPaths.push(item.serverPath);
        } else {
          const res = await apiClient.uploadPhoto(item.file);
          uploadedPaths.push(res.filePath);
        }
      }

      // Submit message
      const res = await apiClient.submitMessage({
        author_name: authorName.trim(),
        message: message.trim(),
        photos: uploadedPaths,
        consent,
      });

      setSuccessMessage(res.message);
      // Clean up form inputs
      setAuthorName('');
      setMessage('');
      setConsent(false);
      setPhotos([]);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Houve uma falha ao enviar sua mensagem. O conteúdo digitado foi preservado para nova tentativa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="escrever-recado" className="py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-2 text-[#C49C62]">
          <Heart className="w-4 h-4 fill-current" />
          <span className="text-xs uppercase tracking-widest font-semibold">Deixe sua homenagem</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#612A44] mb-3">
          Um mural cheio de carinho
        </h2>
        <p className="text-sm sm:text-base text-[#612A44]/75 max-w-lg mx-auto font-sans leading-relaxed">
          Algumas palavras ficam guardadas para sempre no coração. Deixe aqui uma mensagem especial para Waleska.
        </p>
      </div>

      {/* Confirmation Card */}
      {successMessage ? (
        <div className="bg-white border border-[#879783]/40 rounded-3xl p-8 sm:p-10 shadow-sm text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#879783]/15 flex items-center justify-center text-[#879783]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-display font-bold text-[#612A44]">
            Muito obrigado pelo carinho!
          </h3>
          <p className="text-sm sm:text-base text-[#612A44]/80 max-w-md mx-auto leading-relaxed">
            {successMessage}
          </p>
          <div className="pt-4">
            <button
              onClick={() => setSuccessMessage(null)}
              className="px-6 py-2.5 bg-[#FFF9F5] border border-[#F6D5D5] hover:bg-[#F6D5D5]/30 text-[#612A44] rounded-full text-xs sm:text-sm font-medium transition-colors"
            >
              Escrever outro recado
            </button>
          </div>
        </div>
      ) : (
        /* Form Card */
        <div className="bg-white/95 backdrop-blur-sm border border-[#F6D5D5] rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
          
          {/* Gentle floral corner accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#F6D5D5] via-[#C49C62] to-[#F5B5A4]" />

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Author Name */}
            <div>
              <label htmlFor="authorName" className="block text-xs uppercase tracking-wider font-semibold text-[#612A44] mb-2">
                Seu nome <span className="text-[#C49C62]">*</span>
              </label>
              <input
                id="authorName"
                type="text"
                required
                maxLength={60}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Como Waleska te conhece?"
                className="w-full px-4 py-3 bg-[#FFF9F5] border border-[#F6D5D5] rounded-xl text-sm text-[#612A44] placeholder-[#612A44]/40 focus:outline-none focus:ring-2 focus:ring-[#C49C62]/40 focus:border-[#C49C62] transition-colors"
              />
              <div className="flex justify-between items-center text-xs text-[#612A44]/60 mt-1.5 px-1">
                <span>Máximo 60 caracteres</span>
                <span className="tabular-nums">{authorName.length}/60</span>
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-xs uppercase tracking-wider font-semibold text-[#612A44] mb-2">
                Seu recado para Waleska <span className="text-[#C49C62]">*</span>
              </label>
              <textarea
                id="message"
                required
                rows={5}
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreva suas palavras de amor, memórias inesquecíveis ou votos de felicidade..."
                className="w-full px-4 py-3 bg-[#FFF9F5] border border-[#F6D5D5] rounded-xl text-sm text-[#612A44] placeholder-[#612A44]/40 focus:outline-none focus:ring-2 focus:ring-[#C49C62]/40 focus:border-[#C49C62] transition-colors resize-y min-h-[120px]"
              />
              <div className="flex justify-between items-center text-xs text-[#612A44]/60 mt-1.5 px-1">
                <span>Mínimo 5 e máximo 1.000 caracteres</span>
                <span className="tabular-nums font-mono">{message.length}/1000</span>
              </div>
            </div>

            {/* Photo Attachments (Optional, up to 3) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-[#612A44]">
                  Compartilhar uma lembrança <span className="text-xs font-normal text-[#879783]">(opcional)</span>
                </label>
                <span className="text-xs text-[#879783] font-medium">Até 3 fotos (máx. 4 MB cada)</span>
              </div>

              {/* Thumbnails preview */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {photos.map((item, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-[#F6D5D5] group bg-[#FFF9F5]">
                      <img
                        src={item.preview}
                        alt={`Prévia da foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1.5 right-1.5 p-1 bg-white/90 hover:bg-white text-red-600 rounded-full shadow-xs transition-colors"
                        title="Remover fotografia"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add file trigger */}
              {photos.length < 3 && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="photoUpload"
                  />
                  <label
                    htmlFor="photoUpload"
                    className="flex flex-col items-center justify-center p-5 border border-dashed border-[#C49C62]/50 hover:border-[#C49C62] bg-[#FFF9F5]/60 hover:bg-[#FFF9F5] rounded-xl cursor-pointer transition-colors text-center"
                  >
                    <ImagePlus className="w-6 h-6 text-[#C49C62] mb-1.5" />
                    <span className="text-xs font-medium text-[#612A44]">
                      Anexar fotografia ou lembrança especial
                    </span>
                    <span className="text-[11px] text-[#879783] mt-0.5">
                      JPG, PNG ou WebP direto do celular ou computador
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#F6D5D5] text-[#612A44] focus:ring-[#C49C62]"
                />
                <span className="text-xs text-[#612A44]/80 leading-relaxed">
                  Autorizo a publicação desta mensagem e das fotografias anexadas no mural comemorativo de Waleska, ciente de que o conteúdo será exibido publicamente após moderação. <span className="text-[#C49C62]">*</span>
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-[#612A44] hover:bg-[#451B30] disabled:bg-[#612A44]/70 text-white font-medium rounded-full shadow-sm hover:shadow transition-all duration-200 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#F5B5A4]" />
                    <span>Enviando seu carinho...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-[#F5B5A4]" />
                    <span>Enviar meu carinho</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      )}

    </section>
  );
};
