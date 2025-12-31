import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type FinalResult = 'white_wins' | 'black_wins' | 'draw';

const isFinalResult = (v: unknown): v is FinalResult =>
  v === 'white_wins' || v === 'black_wins' || v === 'draw';

type ProfileRow = {
  id: string;
  user_id: string;
  rating: number | null;
  games_played: number | null;
  games_won: number | null;
  games_lost: number | null;
  games_drawn: number | null;
  score: number | null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const gameId = body?.gameId as string | undefined;
    const result = body?.result as unknown;
    const fen = (body?.fen as string | undefined) ?? null;
    const pgn = (body?.pgn as string | undefined) ?? null;
    const whiteTimeRemaining = (body?.whiteTimeRemaining as number | undefined) ?? null;
    const blackTimeRemaining = (body?.blackTimeRemaining as number | undefined) ?? null;

    if (!gameId || !isFinalResult(result)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      console.error('finalize-game auth error:', userErr?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const service = createClient(supabaseUrl, supabaseServiceKey);

    const { data: game, error: gameErr } = await service
      .from('games')
      .select('id, result, white_player_id, black_player_id, tournament_id')
      .eq('id', gameId)
      .single();

    if (gameErr || !game) throw new Error(gameErr?.message || 'Game not found');

    const { data: profiles, error: profErr } = await service
      .from('profiles')
      .select('id, user_id, rating, games_played, games_won, games_lost, games_drawn, score')
      .in('id', [game.white_player_id, game.black_player_id]);

    if (profErr || !profiles || profiles.length < 2) {
      throw new Error(profErr?.message || 'Player profiles not found');
    }

    const whiteProfile = profiles.find((p: ProfileRow) => p.id === game.white_player_id) as ProfileRow | undefined;
    const blackProfile = profiles.find((p: ProfileRow) => p.id === game.black_player_id) as ProfileRow | undefined;

    if (!whiteProfile || !blackProfile) throw new Error('Player profiles not found');

    const requesterId = userData.user.id;
    const isParticipant = requesterId === whiteProfile.user_id || requesterId === blackProfile.user_id;
    if (!isParticipant) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure idempotency: only apply once when the game is still pending/in progress.
    const { data: updated, error: updErr } = await service
      .from('games')
      .update({
        result: result as any,
        fen,
        pgn,
        white_time_remaining: whiteTimeRemaining,
        black_time_remaining: blackTimeRemaining,
        ended_at: new Date().toISOString(),
        draw_offered_by: null,
      })
      .eq('id', gameId)
      .in('result', ['pending', 'in_progress'])
      .select('id');

    if (updErr) throw new Error(updErr.message);

    if (!updated || updated.length === 0) {
      return new Response(JSON.stringify({ alreadyFinalized: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Points
    let whiteScore = 0;
    let blackScore = 0;
    if (result === 'white_wins') whiteScore = 1;
    if (result === 'black_wins') blackScore = 1;
    if (result === 'draw') {
      whiteScore = 0.5;
      blackScore = 0.5;
    }

    // Elo
    const whiteRating = whiteProfile.rating ?? 1200;
    const blackRating = blackProfile.rating ?? 1200;
    const expectedWhite = 1 / (1 + Math.pow(10, (blackRating - whiteRating) / 400));
    const expectedBlack = 1 - expectedWhite;
    const K = 32;

    let whiteRatingChange = 0;
    let blackRatingChange = 0;
    if (result === 'white_wins') {
      whiteRatingChange = Math.round(K * (1 - expectedWhite));
      blackRatingChange = Math.round(K * (0 - expectedBlack));
    } else if (result === 'black_wins') {
      whiteRatingChange = Math.round(K * (0 - expectedWhite));
      blackRatingChange = Math.round(K * (1 - expectedBlack));
    } else {
      whiteRatingChange = Math.round(K * (0.5 - expectedWhite));
      blackRatingChange = Math.round(K * (0.5 - expectedBlack));
    }

    // Tournament scores
    const { data: tpRows, error: tpErr } = await service
      .from('tournament_players')
      .select('player_id, score')
      .eq('tournament_id', game.tournament_id)
      .in('player_id', [game.white_player_id, game.black_player_id]);

    if (tpErr) throw new Error(tpErr.message);

    const whiteTp = tpRows?.find((r: any) => r.player_id === game.white_player_id);
    const blackTp = tpRows?.find((r: any) => r.player_id === game.black_player_id);

    if (whiteTp) {
      const next = Number(whiteTp.score || 0) + whiteScore;
      const { error } = await service
        .from('tournament_players')
        .update({ score: next })
        .eq('tournament_id', game.tournament_id)
        .eq('player_id', game.white_player_id);
      if (error) throw new Error(error.message);
    }

    if (blackTp) {
      const next = Number(blackTp.score || 0) + blackScore;
      const { error } = await service
        .from('tournament_players')
        .update({ score: next })
        .eq('tournament_id', game.tournament_id)
        .eq('player_id', game.black_player_id);
      if (error) throw new Error(error.message);
    }

    // Profile stats
    const whiteWon = result === 'white_wins' ? 1 : 0;
    const whiteLost = result === 'black_wins' ? 1 : 0;
    const whiteDrawn = result === 'draw' ? 1 : 0;

    const blackWon = result === 'black_wins' ? 1 : 0;
    const blackLost = result === 'white_wins' ? 1 : 0;
    const blackDrawn = result === 'draw' ? 1 : 0;

    const { error: wErr } = await service
      .from('profiles')
      .update({
        rating: whiteRating + whiteRatingChange,
        games_played: (whiteProfile.games_played ?? 0) + 1,
        games_won: (whiteProfile.games_won ?? 0) + whiteWon,
        games_lost: (whiteProfile.games_lost ?? 0) + whiteLost,
        games_drawn: (whiteProfile.games_drawn ?? 0) + whiteDrawn,
        score: Number(whiteProfile.score ?? 0) + whiteScore,
      })
      .eq('id', whiteProfile.id);

    if (wErr) throw new Error(wErr.message);

    const { error: bErr } = await service
      .from('profiles')
      .update({
        rating: blackRating + blackRatingChange,
        games_played: (blackProfile.games_played ?? 0) + 1,
        games_won: (blackProfile.games_won ?? 0) + blackWon,
        games_lost: (blackProfile.games_lost ?? 0) + blackLost,
        games_drawn: (blackProfile.games_drawn ?? 0) + blackDrawn,
        score: Number(blackProfile.score ?? 0) + blackScore,
      })
      .eq('id', blackProfile.id);

    if (bErr) throw new Error(bErr.message);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('finalize-game error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
