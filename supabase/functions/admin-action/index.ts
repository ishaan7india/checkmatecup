import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data, adminKey } = await req.json();
    
    // Simple admin key validation
    if (adminKey !== 'CheckmateCup2K25Admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let result;

    switch (action) {
      case 'createTournament': {
        const { data: tournament, error } = await supabase
          .from('tournaments')
          .insert({
            name: data.name || 'Checkmate Cup 2K25',
            format: data.format || 'swiss',
            status: 'registration',
            time_control: data.timeControl || '10 | 5',
          })
          .select()
          .single();
        
        if (error) throw error;
        result = tournament;
        break;
      }

      case 'updateTournament': {
        const { error } = await supabase
          .from('tournaments')
          .update({
            format: data.format,
            time_control: data.timeControl,
          })
          .eq('id', data.tournamentId);
        
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'startTournament': {
        const { error } = await supabase
          .from('tournaments')
          .update({
            status: 'in_progress',
            current_round: 1,
            total_rounds: data.totalRounds,
          })
          .eq('id', data.tournamentId);
        
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'createGame': {
        const { error } = await supabase
          .from('games')
          .insert({
            tournament_id: data.tournamentId,
            round: data.round,
            white_player_id: data.whitePlayerId,
            black_player_id: data.blackPlayerId,
            result: 'pending',
          });
        
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'updatePlayerScore': {
        const { error } = await supabase
          .from('tournament_players')
          .update({ score: data.score })
          .eq('tournament_id', data.tournamentId)
          .eq('player_id', data.playerId);
        
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'publishResults': {
        // Insert champions
        const { error: champError } = await supabase
          .from('champions')
          .insert({
            tournament_id: data.tournamentId,
            first_place_id: data.firstPlace,
            second_place_id: data.secondPlace,
            third_place_id: data.thirdPlace,
            published: true,
          });
        
        if (champError) throw champError;

        // Update tournament status
        const { error: tourError } = await supabase
          .from('tournaments')
          .update({ status: 'completed' })
          .eq('id', data.tournamentId);
        
        if (tourError) throw tourError;
        result = { success: true };
        break;
      }

      case 'registerAllPlayers': {
        // Get all profiles
        const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('id');
        
        if (profError) throw profError;

        // Register all players who aren't already registered
        for (const profile of profiles || []) {
          await supabase
            .from('tournament_players')
            .upsert({
              tournament_id: data.tournamentId,
              player_id: profile.id,
              score: 0,
            }, { onConflict: 'tournament_id,player_id' });
        }
        result = { success: true, count: profiles?.length || 0 };
        break;
      }

      case 'resetTournament': {
        // Delete all games for this tournament
        await supabase
          .from('games')
          .delete()
          .eq('tournament_id', data.tournamentId);
        
        // Delete all tournament players
        await supabase
          .from('tournament_players')
          .delete()
          .eq('tournament_id', data.tournamentId);
        
        // Delete champions if any
        await supabase
          .from('champions')
          .delete()
          .eq('tournament_id', data.tournamentId);
        
        // Delete the tournament
        await supabase
          .from('tournaments')
          .delete()
          .eq('id', data.tournamentId);
        
        result = { success: true };
        break;
      }

      case 'deleteAllAccounts': {
        // Delete all profiles (this will cascade to related data)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id');
        
        // Delete profiles
        await supabase
          .from('profiles')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        // Delete auth users through admin API
        for (const profile of profiles || []) {
          await supabase.auth.admin.deleteUser(profile.user_id);
        }
        
        result = { success: true, count: profiles?.length || 0 };
        break;
      }

      case 'advanceRound': {
        // Get current tournament state
        const { data: tournament } = await supabase
          .from('tournaments')
          .select('current_round')
          .eq('id', data.tournamentId)
          .single();
        
        const nextRound = (tournament?.current_round || 0) + 1;
        
        const { error } = await supabase
          .from('tournaments')
          .update({ current_round: nextRound })
          .eq('id', data.tournamentId);
        
        if (error) throw error;
        result = { success: true, round: nextRound };
        break;
      }

      default:
        throw new Error('Unknown action');
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Admin action error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
