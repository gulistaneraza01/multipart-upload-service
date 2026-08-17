import { Toaster } from 'sonner'
import { UploadPage } from '@/components/UploadPage'

function App() {
  return (
    <>
      <UploadPage />
      <Toaster richColors position="top-right" closeButton />
    </>
  )
}

export default App