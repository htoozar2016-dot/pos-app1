import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, CreditCard, Loader2, Smartphone, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Product, Order, OrderItem } from "@/lib/api";
import { getProducts, createOrder } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CartItem extends OrderItem {
  cartQty: number;
}

const configuredPaymentBalance = Number(import.meta.env.VITE_PAYMENT_BALANCE ?? 500);
const PAYMENT_BALANCE = Number.isFinite(configuredPaymentBalance) ? configuredPaymentBalance : 500;

const paymentMethods = [
  { id: "card", label: "Card" },
  { id: "cash", label: "Cash" },
  { id: "mobile", label: "Mobile Pay" },
] as const;

type PaymentMethod = (typeof paymentMethods)[number]["id"];
type PaymentStep = "review" | "processing" | "success" | "failed";

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("review");
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const loadProducts = () =>
    getProducts()
      .then(setProducts)
      .catch((error) => {
        setProducts([]);
        toast.error(error instanceof Error ? error.message : "Failed to load products");
      });

  useEffect(() => { loadProducts(); }, []);

  function addToCart(product: Product) {
    if (product.qty === 0) { toast.error("Out of stock"); return; }
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        if (existing.cartQty >= product.qty) { toast.error("Not enough stock"); return prev; }
        return prev.map((c) => c.productId === product.id ? { ...c, cartQty: c.cartQty + 1 } : c);
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, qty: 1, cartQty: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev.map((c) => {
        if (c.productId !== productId) return c;
        const newQty = c.cartQty + delta;
        if (newQty <= 0) return c;
        const stock = products.find((p) => p.id === productId)?.qty ?? 0;
        if (newQty > stock) { toast.error("Not enough stock"); return c; }
        return { ...c, cartQty: newQty };
      })
    );
  }

  const total = cart.reduce((sum, c) => sum + c.price * c.cartQty, 0);
  const remainingBalance = Math.max(PAYMENT_BALANCE - total, 0);
  const balanceCoversTotal = total <= PAYMENT_BALANCE;

  function openPaymentDialog() {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    setPaymentStep("review");
    setPaymentOrder(null);
    setPaymentError(null);
    setPaymentOpen(true);
  }

  function handlePaymentOpenChange(open: boolean) {
    if (!open && loading) return;
    setPaymentOpen(open);
  }

  async function handleCheckout() {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    setLoading(true);
    setPaymentStep("processing");
    setPaymentOrder(null);
    setPaymentError(null);
    try {
      const items: OrderItem[] = cart.map((c) => ({ productId: c.productId, name: c.name, price: c.price, qty: c.cartQty }));
      const result = await createOrder(items, paymentMethod);
      if (result.order?.status === "confirmed") {
        const paymentMessage = result.order.payment?.message;
        setPaymentOrder(result.order);
        setPaymentStep("success");
        toast.success(
          paymentMessage
            ? `Order #${result.order.id} confirmed. ${paymentMessage}`
            : `Order #${result.order.id} confirmed!`
        );
        setCart([]);
        loadProducts();
      } else {
        const paymentMessage = result.order?.payment?.message;
        const message = paymentMessage ?? result.error ?? "Order failed";
        setPaymentOrder(result.order ?? null);
        setPaymentError(message);
        setPaymentStep("failed");
        toast.error(message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Order failed";
      setPaymentError(message);
      setPaymentStep("failed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 flex gap-6 h-full">
      {/* Product Grid */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4">POS</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((p) => (
            <Card
              key={p.id}
              className={`cursor-pointer transition-all hover:shadow-md ${p.qty === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => addToCart(p)}
            >
              <CardContent className="p-4">
                <p className="font-semibold text-sm leading-tight mb-1">{p.name}</p>
                <p className="text-lg font-bold text-primary">${p.price.toFixed(2)}</p>
                <Badge variant={p.qty > 10 ? "secondary" : p.qty > 0 ? "outline" : "destructive"} className="mt-1 text-xs">
                  {p.qty === 0 ? "Out of stock" : `${p.qty} left`}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div className="w-80 flex flex-col">
        <div className="rounded-lg border bg-card flex flex-col h-full">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg">Cart</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Add items from the left</p>
            )}
            {cart.map((c) => (
              <div key={c.productId} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">${c.price.toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-6 w-6 text-xs" onClick={() => changeQty(c.productId, -1)}>−</Button>
                  <span className="w-6 text-center text-sm">{c.cartQty}</span>
                  <Button size="icon" variant="outline" className="h-6 w-6 text-xs" onClick={() => changeQty(c.productId, 1)}>+</Button>
                </div>
                <p className="text-sm font-semibold w-14 text-right">${(c.price * c.cartQty).toFixed(2)}</p>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(c.productId)}>×</Button>
              </div>
            ))}
          </div>
          <div className="p-4 border-t space-y-3">
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <Button className="w-full" size="lg" onClick={openPaymentDialog} disabled={loading || cart.length === 0}>
              Checkout
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={paymentOpen} onOpenChange={handlePaymentOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={!loading}>
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
            <DialogDescription>
              Review the order and authorize payment.
            </DialogDescription>
          </DialogHeader>

          {paymentStep === "review" && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order total</span>
                  <span className="font-semibold">{formatMoney(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current balance</span>
                  <span>{formatMoney(PAYMENT_BALANCE)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">After payment</span>
                  <span>{formatMoney(remainingBalance)}</span>
                </div>
                <div className="pt-1">
                  <Badge variant={balanceCoversTotal ? "secondary" : "destructive"}>
                    {balanceCoversTotal ? "Balance available" : "Balance too low"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Payment method</p>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((method) => (
                    <Button
                      key={method.id}
                      type="button"
                      variant={paymentMethod === method.id ? "default" : "outline"}
                      className="h-auto flex-col gap-2 py-3"
                      onClick={() => setPaymentMethod(method.id)}
                    >
                      {method.id === "card" && <CreditCard />}
                      {method.id === "cash" && <Banknote />}
                      {method.id === "mobile" && <Smartphone />}
                      <span className="text-xs">{method.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {paymentStep === "processing" && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="mx-auto size-9 animate-spin text-primary" />
              <div>
                <p className="font-semibold">Authorizing payment</p>
                <p className="text-sm text-muted-foreground">{formatMoney(total)} via {paymentMethod}</p>
              </div>
            </div>
          )}

          {paymentStep === "success" && paymentOrder && (
            <div className="py-4 text-center space-y-3">
              <CheckCircle2 className="mx-auto size-10 text-primary" />
              <div>
                <p className="font-semibold">Payment approved</p>
                <p className="text-sm text-muted-foreground">Order #{paymentOrder.id} confirmed</p>
              </div>
              <div className="rounded-lg border p-3 text-left text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">{formatMoney(paymentOrder.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance</span>
                  <span>{formatMoney(Math.max(PAYMENT_BALANCE - paymentOrder.total, 0))}</span>
                </div>
                {paymentOrder.payment?.transactionId && (
                  <div>
                    <p className="text-muted-foreground">Transaction</p>
                    <p className="font-mono break-all">{paymentOrder.payment.transactionId}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {paymentStep === "failed" && (
            <div className="py-4 text-center space-y-3">
              <XCircle className="mx-auto size-10 text-destructive" />
              <div>
                <p className="font-semibold">Payment declined</p>
                <p className="text-sm text-muted-foreground">{paymentError ?? paymentOrder?.payment?.message ?? "Order failed"}</p>
              </div>
              <div className="rounded-lg border p-3 text-left text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">{formatMoney(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current balance</span>
                  <span>{formatMoney(PAYMENT_BALANCE)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {paymentStep === "review" && (
              <>
                <Button variant="outline" onClick={() => setPaymentOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCheckout} disabled={loading || cart.length === 0}>
                  Pay {formatMoney(total)}
                </Button>
              </>
            )}
            {paymentStep === "processing" && (
              <Button disabled>
                Processing...
              </Button>
            )}
            {paymentStep === "success" && (
              <Button onClick={() => setPaymentOpen(false)}>
                Done
              </Button>
            )}
            {paymentStep === "failed" && (
              <>
                <Button variant="outline" onClick={() => setPaymentOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => setPaymentStep("review")}>
                  Try again
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
