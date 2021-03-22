import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  async function checkStock(productId: number) {

    return await api.get<Stock>(`/stock/${productId}`);
  }

  async function getProduct(productId: number) {
    const product = await api.get<Product>(`/products/${productId}`);

    return product;
  }

  const addProduct = async (productId: number) => {
    try {

      const index = cart.findIndex(f => f.id === productId);

      const stock = await checkStock(productId);

      const amountCart = (index > -1) ? cart[index].amount : 0;

      const amount = Number(stock.data.amount - (amountCart + 1));

      if (amount < 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const product = await getProduct(productId);

      if (product.status === 404) {
        toast.error('Erro na adição do produto');
        return;
      }



      const { id, title, price, image } = product.data as Product;
      if (index === -1) {

        const newCart = [...cart, { id, title, price, image, amount: 1 }];

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      } else {

        const updateCart = cart.map(product => {
          if (product.id === productId) {
            return {
              id: product.id,
              title: product.title,
              price: product.price,
              image: product.image,
              amount: product.amount + 1
            }

          }
          return product;
        });

        setCart(updateCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {

      const index = cart.findIndex(f => f.id === productId);

      if (index < 0) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const products = cart.filter(f => f.id !== productId);
      setCart(products);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount === 0)
        return;

      const stock = await checkStock(productId);

      const amountStock = Number(stock.data.amount - amount);


      if (amountStock < 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const objs = cart.map(product => {
        if (product.id === productId) {
          return {
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
            amount: amount
          }

        }
        return product;
      });
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(objs));
      setCart(objs);

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
