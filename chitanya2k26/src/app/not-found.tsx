import Link from "next/link";
export default function NotFound() {
  return (
    <div className="state" style={{ minHeight: "80vh", justifyContent: "center" }}>
      <div className="glyph">404</div>
      <h2>Page not found</h2>
      <p>The page you are looking for does not exist or is not public yet.</p>
      <div className="row"><Link href="/" className="btn primary">Go home</Link><Link href="/contests" className="btn">Browse contests</Link></div>
    </div>
  );
}
