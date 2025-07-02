import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1001,
          background: 'rgba(0,0,0,0.8)',
          padding: '10px',
          borderRadius: '5px',
        }}
      >
        <Link
          href="/about"
          style={{
            color: 'white',
            textDecoration: 'none',
            padding: '8px 16px',
            background: '#28a745',
            borderRadius: '3px',
            display: 'inline-block',
          }}
        >
          About 페이지로
        </Link>
      </div>
    </div>
  );
}
