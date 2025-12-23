import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fen, difficulty } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const difficultyPrompts: Record<string, string> = {
      beginner: "You are a beginner chess player. Make reasonable but not optimal moves. Sometimes miss obvious tactics. Play like someone learning chess.",
      intermediate: "You are an intermediate chess player (around 1200-1400 ELO). Play solid moves but occasionally miss deeper tactics. Balance between offense and defense.",
      advanced: "You are an advanced chess player (around 1600-1800 ELO). Play strong positional moves and look for tactical opportunities. Avoid blunders.",
      master: "You are a chess master (2000+ ELO). Play the strongest move possible. Look for deep tactics, positional advantages, and optimal piece coordination."
    };

    const systemPrompt = `${difficultyPrompts[difficulty] || difficultyPrompts.intermediate}

You are playing a chess game. Given the current board position in FEN notation, analyze and return your next move.

CRITICAL RULES:
1. You MUST return ONLY a valid chess move in UCI format (e.g., "e2e4", "g1f3", "e7e8q" for pawn promotion)
2. The move MUST be legal given the current position
3. DO NOT include any explanation, just the move
4. Consider the position carefully before responding
5. If you're in check, you MUST get out of check
6. DO NOT return moves that would put or leave your king in check`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Current position (FEN): ${fen}\n\nWhat is your move? Reply with ONLY the UCI move notation (e.g., e2e4).` }
        ],
        temperature: difficulty === "beginner" ? 0.9 : difficulty === "master" ? 0.1 : 0.5,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const moveText = data.choices?.[0]?.message?.content?.trim().toLowerCase() || "";
    
    // Extract just the move (handles cases where AI might add extra text)
    const moveMatch = moveText.match(/^[a-h][1-8][a-h][1-8][qrbn]?/);
    const move = moveMatch ? moveMatch[0] : moveText.slice(0, 5).replace(/[^a-h1-8qrbn]/g, '');

    return new Response(JSON.stringify({ move }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chess bot error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
