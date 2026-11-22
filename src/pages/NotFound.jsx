import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center p-6 text-center">
      <div>
        <p className="text-5xl font-bold text-primary">404</p>
        <h1 className="mt-2 text-lg font-semibold">Page not found</h1>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">Go to dashboard</Link>
      </div>
    </div>
  )
}
