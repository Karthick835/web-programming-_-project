import React, { useState } from 'react';
import { Search, Filter, Gamepad2, Sparkles } from 'lucide-react';
import GameCard from '../components/GameCard';
import SectionHeading from '../components/ui/SectionHeading';
import EmptyState from '../components/ui/EmptyState';
import { trackEvent } from '../services/tracker';

export default function GamesPage({ games, onSelectGame, wishlist = [], onToggleWishlist }) {
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const genres = ['All', 'Action RPG', 'Pixel Roguelike', 'Adventure', 'Tactics'];
  const statuses = ['All', 'Released', 'In Beta', 'In Development'];

  const filteredGames = games.filter((game) => {
    const matchGenre = selectedGenre === 'All' || game.genre.toLowerCase().includes(selectedGenre.toLowerCase());
    const matchStatus = selectedStatus === 'All' || game.status === selectedStatus;
    const matchSearch =
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (game.tags && game.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    return matchGenre && matchStatus && matchSearch;
  });

  const handleGenreChange = (g) => {
    setSelectedGenre(g);
    trackEvent('click', '/games', { filter_genre: g });
  };

  return (
    <div className="page-container py-12 md:py-16 space-y-12">
      
      {/* Header */}
      <SectionHeading
        badge="CATALOGUE & DOSSIERS"
        title="THE PIXEL FORGE UNIVERSE"
        subtitle="Explore our complete library of shipped titles, public betas, and in-development prototypes."
        align="center"
      />

      {/* Filter & Search Bar */}
      <div className="bg-[#0f1224]/80 p-5 sm:p-6 rounded-lg border border-[rgba(0,240,255,0.18)] backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#8a93b8] absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search by title, genre, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#07080f] border border-slate-700 rounded text-xs sm:text-sm text-[#e8ecff] focus:outline-none focus:border-[#00f0ff] font-sans"
            />
          </div>

          {/* Status Quick Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs text-[#8a93b8] font-mono flex-shrink-0">Status:</span>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1 rounded text-xs font-mono transition-all flex-shrink-0 cursor-pointer ${
                  selectedStatus === s
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/60'
                    : 'bg-[#07080f] text-[#8a93b8] hover:text-white border border-slate-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

        </div>

        {/* Genre Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-slate-800/80">
          <span className="text-xs text-[#8a93b8] font-mono flex-shrink-0">Genre:</span>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => handleGenreChange(g)}
              className={`px-3.5 py-1.5 rounded text-xs font-pixel tracking-wider transition-all flex-shrink-0 cursor-pointer ${
                selectedGenre === g
                  ? 'bg-gradient-to-r from-[#00f0ff] to-blue-600 text-black font-bold shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                  : 'bg-[#07080f] text-[#8a93b8] hover:text-[#00f0ff] border border-slate-800'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Game Cards Grid */}
      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onSelect={onSelectGame}
              isWishlisted={wishlist.includes(game.id)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Gamepad2}
          title="No Games Found"
          description="No games matched your active filter or search query. Try clearing the filter or searching for another term."
          actionLabel="Reset All Filters"
          onAction={() => {
            setSelectedGenre('All');
            setSelectedStatus('All');
            setSearchQuery('');
          }}
        />
      )}

    </div>
  );
}
