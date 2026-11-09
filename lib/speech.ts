import { toSpokenRupees } from "@/lib/hindi";

export function udhaarSpeech(name: string, amount: number, balance: number): string {
  return `${name} ke khate mein ${toSpokenRupees(amount)} udhaar likh diya. Kul balance ${toSpokenRupees(balance)}.`;
}

export function paymentSpeech(name: string, amount: number, balance: number): string {
  return `${toSpokenRupees(amount)} jama. ${name} ka balance ab ${toSpokenRupees(balance)}.`;
}

export function balanceSpeech(name: string, balance: number): string {
  return `${name} ka balance ${toSpokenRupees(balance)} hai.`;
}

export function addCustomerSpeech(name: string): string {
  return `${name} ka naya khata khol diya.`;
}

export function rentSpeech(amount: number, status: "due" | "paid"): string {
  return status === "paid"
    ? `${toSpokenRupees(amount)} kiraya jama kar diya.`
    : `Dukaan ka kiraya ${toSpokenRupees(amount)} baaki likh diya.`;
}

export function billSpeech(label: string, amount: number, status: "due" | "paid"): string {
  return status === "paid"
    ? `${label} ka ${toSpokenRupees(amount)} bill de diya.`
    : `${label} ka bill ${toSpokenRupees(amount)} likh diya.`;
}

export function rentReceivedSpeech(name: string, amount: number, assetName?: string): string {
  return `${name} se ${assetName ? `${assetName} ka ` : ""}${toSpokenRupees(amount)} kiraya jama likh diya.`;
}

export function startRentalSpeech(assetName: string, customerName: string, rate: number, days?: number): string {
  return `${customerName} ko ${assetName} ${days ? `${days} din ke liye ` : ""}kiraye par de diya.`;
}

export function returnRentalSpeech(assetName: string, customerName?: string, totalAmount?: number): string {
  return `${customerName ? `${customerName} ne ` : ""}${assetName} wapas kar diya.${totalAmount ? ` Kul ${toSpokenRupees(totalAmount)}.` : ""}`;
}

