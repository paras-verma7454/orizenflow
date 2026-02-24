"use client";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { apiClient } from "@/lib/api/client";

export function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    
    try {
      const res = await apiClient.waitlist.join.$post({
        json: { email }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.message || "Failed to join waitlist");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Connection error. Please try again.");
    }
  };

  return (
    <section id="waitlist" className="py-24 relative overflow-hidden bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
      <div className="max-w-3xl mx-auto px-6 text-center relative z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
            Join early access
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Be among the first to experience evidence-based hiring. We're launching soon.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 max-w-md mx-auto pointer-events-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-full border-border bg-card px-6 focus-visible:ring-accent"
              required
            />
            <Button 
              type="submit" 
              size="lg" 
              disabled={status === "loading"}
              className="h-12 rounded-full px-8 bg-primary text-primary-foreground font-semibold"
            >
              {status === "loading" ? "Joining..." : "Join Waitlist"}
            </Button>
          </form>

          {(status === "success" || status === "error") && (
            <p className={`mt-4 font-medium ${status === "success" ? "text-accent" : "text-destructive"}`}>
              {message}
            </p>
          )}
        </div>
      </div>

      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
    </section>
  );
}
