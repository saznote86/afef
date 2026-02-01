
import { Product } from '../types';

export class RAGEngine {
  private products: Product[] = [];

  constructor() {
    this.loadProducts();
  }

  private async loadProducts() {
    try {
      const response = await fetch('/knowledge/products.json');
      this.products = await response.json();
    } catch (error) {
      console.error('Failed to load products for RAG:', error);
    }
  }

  public search(query: string): Product[] {
    const q = query.toLowerCase();
    return this.products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.brand.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }

  public getContext(query: string): string {
    const matches = this.search(query);
    if (matches.length === 0) return "Aucun produit spécifique trouvé dans la base locale.";
    
    return "Produits trouvés :\n" + matches.map(p => 
      `- ${p.name} (${p.brand}): ${p.price} ${p.currency}, Stock: ${p.stock ? 'Oui' : 'Non'}. ${p.description}`
    ).join('\n');
  }
}

export const ragEngine = new RAGEngine();
