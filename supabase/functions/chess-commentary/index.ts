const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const funnyCommentaries = [
  "This game is more intense than my morning coffee! ☕",
  "I've seen soap operas with less drama!",
  "Someone call Netflix, this needs a documentary!",
  "The pieces are sweating more than me in a job interview!",
  "This is why I stick to checkers... just kidding, checkers is boring!",
  "Plot twist: the real treasure was the blunders we made along the way!",
  "If chess was easy, it would be called 'moving pieces randomly'!",
  "The tension is thicker than my holiday fruitcake!",
  "Breaking news: pawns demand better working conditions!",
  "This game has more twists than a pretzel factory!",
  "The knights are getting dizzy from all this action!",
  "Somewhere, a grandmaster just felt a disturbance in the force!",
  "These moves are spicier than my grandma's curry!",
  "The bishops are praying for a miracle!",
  "Even the board is stressed out!",
  "This is peak entertainment! Reality TV could never!",
  "The rooks are shook! Get it? Shook rooks? I'll see myself out...",
  "My pet goldfish plays better! ...okay maybe not.",
  "The chess clock is having an existential crisis!",
  "Professional chess players are taking notes!",
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { moveCount, lastMove } = await req.json();
    
    // Pick a random funny commentary
    const commentary = funnyCommentaries[Math.floor(Math.random() * funnyCommentaries.length)];

    return new Response(
      JSON.stringify({ commentary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Commentary error:', error);
    return new Response(
      JSON.stringify({ commentary: "No comment... I'm speechless! 😶" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
