    'use client'

    import { useState, useEffect } from 'react'
    import { uploadFileForAnalysis } from '@/app/actions/upload'
    import { createClient } from '@/utils/supabase/client'
    import { useRouter } from 'next/navigation'

    export function KnowledgeUploader() {
    const [file, setFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [status, setStatus] = useState<string>('') // pending, processing, completed
    const router = useRouter()
    const supabase = createClient()

    // Gerçek Zamanlı Takip (Realtime Subscription)
    useEffect(() => {
        // Sadece kullanıcı giriş yapmışsa dinle
        const channel = supabase
        .channel('queue-updates')
        .on(
            'postgres_changes',
            {
            event: 'UPDATE',
            schema: 'public',
            table: 'file_processing_queue',
            filter: `status=in.(processing,completed,failed)`
            },
            (payload: any) => {
            // Eğer güncellenen satır bizim yüklediğimiz dosya ise (Burada basitlik için son durumu gösteriyoruz)
            // Gerçek uygulamada ID kontrolü yapılmalı.
            console.log('İşlem Durumu Değişti:', payload.new.status)
            setStatus(payload.new.status)
            
            if (payload.new.status === 'completed') {
                router.refresh()
                setStatus('Tamamlandı! ✅')
                setTimeout(() => setStatus(''), 3000)
            }
            }
        )
        .subscribe()

        return () => {
        supabase.removeChannel(channel)
        }
    }, [supabase, router])

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setIsUploading(true)
        setStatus('Yükleniyor...')

        const formData = new FormData()
        formData.append('file', file)

        const result = await uploadFileForAnalysis(formData)

        setIsUploading(false)
        if (result.success) {
        setStatus('Sırada Bekliyor... ⏳') // Python servisi alana kadar
        setFile(null)
        } else {
        setStatus(`Hata: ${result.error}`)
        }
    }

    return (
        <div className="p-6 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-4">Bilgi Bankasına Belge Ekle</h3>
        
        <form onSubmit={handleUpload} className="space-y-4">
            <div className="relative group">
            <input
                type="file"
                accept=".pdf, .txt, .md, image/png, image/jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-violet-600 file:text-white
                hover:file:bg-violet-700
                cursor-pointer"
                disabled={isUploading}
            />
            </div>

            {file && (
            <button
                type="submit"
                disabled={isUploading}
                className="w-full py-2 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 
                        text-white font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
                {isUploading ? 'Sunucuya Gönderiliyor...' : 'Analizi Başlat'}
            </button>
            )}
        </form>

        {/* Durum Bildirimi */}
        {status && (
            <div className={`mt-4 p-3 rounded-lg text-sm font-medium animate-pulse
            ${status.includes('Hata') ? 'bg-red-500/20 text-red-200' : 
                status.includes('Tamamlandı') ? 'bg-green-500/20 text-green-200' : 
                'bg-yellow-500/20 text-yellow-200'}`}
            >
            Durum: {status === 'processing' ? 'Yapay Zeka Okuyor... 🧠' : status}
            </div>
        )}
        </div>
    )
    }