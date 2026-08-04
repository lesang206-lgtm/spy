import type { Product } from '../types';

interface UnmatchedProductProps {
  product: Product;
  source: 'pharmart' | 'medigo';
}

function formatPrice(price: number): string {
  if (!price || price <= 0) return 'N/A';
  return Math.round(price).toLocaleString('vi-VN') + '₫';
}

function escapeHtml(text: string): string {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

export function UnmatchedProduct({ product, source }: UnmatchedProductProps) {
  const price = formatPrice(product.salePrice || product.price);
  const url = product.product_url || product.url || '';
  const img = product.image_url || product.image || '';
  const label = source === 'pharmart' ? '🔗 Xem trên Pharmart' : '🔗 Xem trên Medigo';

  return (
    <div className="unmatched-item">
      {img && <img src={img} className="unmatched-img" alt="" />}
      <div className="unmatched-info">
        <div className="unmatched-name">{escapeHtml(product.name)}</div>
        <div className="unmatched-price">{price}</div>
        {url && (
          <a href={escapeHtml(url)} target="_blank" className="btn btn-small" rel="noopener noreferrer">
            {label}
          </a>
        )}
      </div>
    </div>
  );
}
