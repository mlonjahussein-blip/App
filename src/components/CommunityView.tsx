import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import { db } from '../lib/firebase.ts';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  increment, 
  setDoc, 
  deleteDoc, 
  getDoc 
} from 'firebase/firestore';
import { CommunityPost, PostComment, DirectMessage, AnalysisResult } from '../types.ts';
import { 
  Users, 
  Heart, 
  MessageSquare, 
  Share2, 
  Sparkles, 
  Award, 
  Send, 
  Filter, 
  ShieldCheck,
  Flame
} from 'lucide-react';

interface CommunityProps {
  onSelectPostSquad?: (post: CommunityPost) => void;
  onNavigateToAnalyzer: () => void;
}

export const CommunityView: React.FC<CommunityProps> = ({ onNavigateToAnalyzer }) => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'top' | 'possession' | 'counter'>('all');
  const [selectedPostComments, setSelectedPostComments] = useState<{ [postId: string]: PostComment[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [showCommentsFor, setShowCommentsFor] = useState<string | null>(null);

  // New post modal state
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostDescription, setNewPostDescription] = useState('');
  const [newPostFormation, setNewPostFormation] = useState('4-2-1-3');
  const [newPostPlaystyle, setNewPostPlaystyle] = useState('Quick Counter');
  const [newPostRating, setNewPostRating] = useState(88);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Direct Messaging state
  const [activeDmUser, setActiveDmUser] = useState<{ uid: string; name: string } | null>(null);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [dmInputText, setDmInputText] = useState('');
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [allUserMessages, setAllUserMessages] = useState<DirectMessage[]>([]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'communityPosts'));
      const snap = await getDocs(q);
      const list: CommunityPost[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as CommunityPost);
      });

      if (list.length === 0) {
        // Seed default community setups if empty
        const defaultPosts: CommunityPost[] = [
          {
            id: 'post_seed_1',
            userId: 'coach_alex',
            authorName: 'TacticianAlex',
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
            title: 'Division 1 Quick Counter 4-2-1-3 Setup with Deep Line Anchor',
            description: 'Reached Division 1 with this balanced double-pivot system. Key instruction is placing Deep Line on Rodri and Defensive on Walker to prevent counter-attacks.',
            formation: '4-2-1-3',
            playstyle: 'Quick Counter',
            squadRating: 89,
            keyPlayers: ['Rodri (DMF)', 'E. Haaland (CF)', 'K. De Bruyne (AMF)', 'V. van Dijk (CB)'],
            analysisSummary: 'Elite central defensive cover with high transition velocity down both wings.',
            likesCount: 24,
            commentsCount: 7
          },
          {
            id: 'post_seed_2',
            userId: 'master_tactics',
            authorName: 'ProPesGamer',
            createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
            title: 'Possession 4-3-1-2 Narrow Diamond: How to Break Low Blocks',
            description: 'Tired of 5-back low block opponents? This narrow diamond creates endless triangle combinations between AMF and the twin strikers.',
            formation: '4-3-1-2',
            playstyle: 'Possession Game',
            squadRating: 91,
            keyPlayers: ['L. Modrić (CMF)', 'L. Messi (SS)', 'K. Benzema (CF)'],
            analysisSummary: 'Overwhelming midfield possession dominance with 65%+ average match control.',
            likesCount: 18,
            commentsCount: 3
          }
        ];
        defaultPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPosts(defaultPosts);
      } else {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPosts(list);
      }
    } catch (err) {
      console.warn('Error fetching community posts:', err);
      const fallbackPosts = [
        {
          id: 'post_seed_1',
          userId: 'coach_alex',
          authorName: 'TacticianAlex',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          title: 'Division 1 Quick Counter 4-2-1-3 Setup with Deep Line Anchor',
          description: 'Reached Division 1 with this balanced double-pivot system. Key instruction is placing Deep Line on Rodri and Defensive on Walker to prevent counter-attacks.',
          formation: '4-2-1-3',
          playstyle: 'Quick Counter',
          squadRating: 89,
          keyPlayers: ['Rodri (DMF)', 'E. Haaland (CF)', 'K. De Bruyne (AMF)', 'V. van Dijk (CB)'],
          analysisSummary: 'Elite central defensive cover with high transition velocity down both wings.',
          likesCount: 24,
          commentsCount: 7
        },
        {
          id: 'post_seed_2',
          userId: 'master_tactics',
          authorName: 'ProPesGamer',
          createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
          title: 'Possession 4-3-1-2 Narrow Diamond: How to Break Low Blocks',
          description: 'Tired of 5-back low block opponents? This narrow diamond creates endless triangle combinations between AMF and the twin strikers.',
          formation: '4-3-1-2',
          playstyle: 'Possession Game',
          squadRating: 91,
          keyPlayers: ['L. Modrić (CMF)', 'L. Messi (SS)', 'K. Benzema (CF)'],
          analysisSummary: 'Overwhelming midfield possession dominance with 65%+ average match control.',
          likesCount: 18,
          commentsCount: 3
        }
      ];
      fallbackPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPosts(fallbackPosts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const openDirectMessage = async (targetUid: string, targetName: string) => {
    if (!user) {
      alert('Please log in or sign up to send direct messages to other community members.');
      return;
    }
    if (targetUid === user.uid) {
      alert('You cannot send a direct message to yourself.');
      return;
    }
    setActiveDmUser({ uid: targetUid, name: targetName });
    await fetchDirectMessages(targetUid);
  };

  const fetchDirectMessages = async (otherUid: string) => {
    if (!user) return;
    try {
      const snap = await getDocs(collection(db, 'directMessages'));
      const msgs: DirectMessage[] = [];
      snap.forEach((d) => {
        const data = d.data() as DirectMessage;
        if (
          (data.senderId === user.uid && data.receiverId === otherUid) ||
          (data.senderId === otherUid && data.receiverId === user.uid)
        ) {
          msgs.push({ ...data, id: d.id });
        }
      });
      msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setDmMessages(msgs);
    } catch (e) {
      console.warn('Error fetching DMs:', e);
    }
  };

  const sendDirectMessage = async () => {
    if (!user || !activeDmUser || !dmInputText.trim()) return;

    const newMsg: DirectMessage = {
      id: 'dm_' + Date.now(),
      senderId: user.uid,
      senderName: profile?.displayName || user.email?.split('@')[0] || 'Coach',
      receiverId: activeDmUser.uid,
      receiverName: activeDmUser.name,
      content: dmInputText.trim(),
      createdAt: new Date().toISOString()
    };

    setDmMessages((prev) => [...prev, newMsg]);
    setDmInputText('');

    try {
      await addDoc(collection(db, 'directMessages'), newMsg);
    } catch (e) {
      console.warn('Error sending DM:', e);
    }
  };

  const fetchAllInboxMessages = async () => {
    if (!user) {
      alert('Please log in to view your direct messages inbox.');
      return;
    }
    try {
      const snap = await getDocs(collection(db, 'directMessages'));
      const msgs: DirectMessage[] = [];
      snap.forEach((d) => {
        const data = d.data() as DirectMessage;
        if (data.senderId === user.uid || data.receiverId === user.uid) {
          msgs.push({ ...data, id: d.id });
        }
      });
      msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllUserMessages(msgs);
      setShowInboxModal(true);
    } catch (e) {
      console.warn('Error fetching inbox:', e);
    }
  };

  const handleLike = async (post: CommunityPost) => {
    if (!user) {
      alert('Please log in or sign up to like community tactical shares.');
      return;
    }

    try {
      const isLiked = post.isLikedByCurrentUser;
      const newCount = isLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likesCount: newCount, isLikedByCurrentUser: !isLiked }
            : p
        )
      );

      // Firestore update
      const postRef = doc(db, 'communityPosts', post.id);
      await updateDoc(postRef, {
        likesCount: increment(isLiked ? -1 : 1)
      });
    } catch (err) {
      console.warn('Like update error:', err);
    }
  };

  const handleToggleComments = async (postId: string) => {
    if (showCommentsFor === postId) {
      setShowCommentsFor(null);
      return;
    }

    setShowCommentsFor(postId);
    if (!selectedPostComments[postId]) {
      try {
        const snap = await getDocs(collection(db, 'postComments'));
        const cmts: PostComment[] = [];
        snap.forEach((d) => {
          const data = d.data() as PostComment;
          if (data.postId === postId) {
            cmts.push({ ...data, id: d.id });
          }
        });
        setSelectedPostComments((prev) => ({ ...prev, [postId]: cmts }));
      } catch (e) {
        console.warn('Comments fetch error:', e);
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || !user) return;

    const newComment: PostComment = {
      id: 'cmt_' + Date.now(),
      postId,
      userId: user.uid,
      authorName: profile?.displayName || user.email?.split('@')[0] || 'Tactician',
      content: text,
      createdAt: new Date().toISOString()
    };

    setSelectedPostComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment]
    }));

    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
      )
    );

    try {
      await addDoc(collection(db, 'postComments'), newComment);
      await updateDoc(doc(db, 'communityPosts', postId), {
        commentsCount: increment(1)
      });
    } catch (err) {
      console.warn('Comment write error:', err);
    }
  };

  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to share your squad with the community.');
      return;
    }
    if (!newPostTitle.trim()) return;

    setIsSubmittingPost(true);
    try {
      const newPost: Omit<CommunityPost, 'id'> = {
        userId: user.uid,
        authorName: profile?.displayName || user.email?.split('@')[0] || 'Tactician',
        createdAt: new Date().toISOString(),
        title: newPostTitle.trim(),
        description: newPostDescription.trim(),
        formation: newPostFormation,
        playstyle: newPostPlaystyle,
        squadRating: Number(newPostRating) || 88,
        keyPlayers: ['Key Starters', 'Anchor DMF', 'Striker'],
        analysisSummary: `Custom ${newPostFormation} setup utilizing ${newPostPlaystyle} playstyle.`,
        likesCount: 1,
        commentsCount: 0,
        isLikedByCurrentUser: true
      };

      const docRef = await addDoc(collection(db, 'communityPosts'), newPost);
      setPosts((prev) => [{ id: docRef.id, ...newPost }, ...prev]);
      setShowCreatePostModal(false);
      setNewPostTitle('');
      setNewPostDescription('');
    } catch (err) {
      console.error('Post creation error:', err);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  return (
    <div id="community-hub-view" className="max-w-5xl mx-auto space-y-8 py-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Tactical Community Hub
            </h1>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Explore and exchange high-rated competitive squads, formation blueprints, and instructions tested by fellow eFootball managers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllInboxMessages}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            Direct Messages
          </button>
          <button
            onClick={() => setShowCreatePostModal(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            Share Your Squad
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'All Tactical Posts' },
          { id: 'top', label: 'Most Upvoted' },
          { id: 'counter', label: 'Quick Counter Builds' },
          { id: 'possession', label: 'Possession Setups' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id as any)}
            className={`px-3.5 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
              activeFilter === f.id
                ? 'bg-neutral-800 text-emerald-400 border border-emerald-500/30'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Posts Stream */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-neutral-400">Loading tactical blueprints...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                      {post.authorName[0]?.toUpperCase() || 'T'}
                    </span>
                    <span className="text-xs font-bold text-neutral-200">
                      {post.authorName}
                    </span>
                    <button
                      onClick={() => openDirectMessage(post.userId, post.authorName)}
                      className="ml-1 px-2.5 py-0.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Send Direct Message to User"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Message</span>
                    </button>
                    <span className="text-neutral-600 text-xs">•</span>
                    <span className="text-[11px] text-neutral-500">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white leading-tight">
                    {post.title}
                  </h3>
                </div>

                {/* Rating Badge */}
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400 leading-none">
                    {post.squadRating}
                  </span>
                  <span className="block text-[10px] text-neutral-400 uppercase font-bold">
                    Rating
                  </span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-950 text-emerald-400 border border-neutral-800">
                  {post.formation}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-950 text-cyan-400 border border-neutral-800">
                  {post.playstyle}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                {post.description}
              </p>

              {/* Key Players Tagging */}
              {post.keyPlayers && post.keyPlayers.length > 0 && (
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block mb-1.5">
                    Crucial Starting Assets
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {post.keyPlayers.map((kp, kIdx) => (
                      <span key={kIdx} className="text-xs px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800">
                        {kp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Post Actions: Like, Comment */}
              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleLike(post)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      post.isLikedByCurrentUser
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${post.isLikedByCurrentUser ? 'fill-current' : ''}`} />
                    <span>{post.likesCount}</span>
                  </button>

                  <button
                    onClick={() => handleToggleComments(post.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-950 text-neutral-400 hover:text-white transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{post.commentsCount} Comments</span>
                  </button>
                </div>

                <button
                  onClick={onNavigateToAnalyzer}
                  className="text-xs font-bold text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  Analyze similar squad →
                </button>
              </div>

              {/* Comments Section */}
              {showCommentsFor === post.id && (
                <div className="pt-4 border-t border-neutral-800 space-y-3">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(selectedPostComments[post.id] || []).length === 0 ? (
                      <p className="text-xs text-neutral-500 italic">No comments yet. Be the first to share your tactical thoughts!</p>
                    ) : (
                      selectedPostComments[post.id].map((c) => (
                        <div key={c.id} className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-neutral-300">{c.authorName}</span>
                            <span className="text-[10px] text-neutral-500">
                              {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-neutral-300">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Write a tactical comment or ask for advice..."
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(post.id);
                      }}
                      className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-lg font-black text-white">Share Squad with Community</h3>
              <button
                onClick={() => setShowCreatePostModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePostSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Post Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Division 1 Possession 4-3-3 with Inverted Wingers"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Formation
                  </label>
                  <select
                    value={newPostFormation}
                    onChange={(e) => setNewPostFormation(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="4-2-1-3">4-2-1-3</option>
                    <option value="4-3-1-2">4-3-1-2</option>
                    <option value="4-2-2-2">4-2-2-2</option>
                    <option value="4-4-2">4-4-2</option>
                    <option value="3-2-3-2">3-2-3-2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Playstyle
                  </label>
                  <select
                    value={newPostPlaystyle}
                    onChange={(e) => setNewPostPlaystyle(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Quick Counter">Quick Counter</option>
                    <option value="Possession Game">Possession Game</option>
                    <option value="Long Ball Counter">Long Ball Counter</option>
                    <option value="Out Wide">Out Wide</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Tactical Breakdown & Tips
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain why this setup works, which individual instructions you apply, and how you manage transitions..."
                  value={newPostDescription}
                  onChange={(e) => setNewPostDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePostModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPost}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950"
                >
                  {isSubmittingPost ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active DM Chat Modal */}
      {activeDmUser && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 flex flex-col h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center">
                  {activeDmUser.name[0]?.toUpperCase() || 'U'}
                </span>
                <div>
                  <h3 className="text-sm font-black text-white">Chat with {activeDmUser.name}</h3>
                  <span className="text-[10px] text-emerald-400">Direct Message Connection</span>
                </div>
              </div>
              <button
                onClick={() => setActiveDmUser(null)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {dmMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 space-y-1">
                  <MessageSquare className="w-8 h-8 text-neutral-700" />
                  <p className="text-xs">No direct messages yet. Send your first message below!</p>
                </div>
              ) : (
                dmMessages.map((msg) => {
                  const isMe = msg.senderId === user?.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs ${
                          isMe
                            ? 'bg-emerald-500 text-neutral-950 rounded-br-none'
                            : 'bg-neutral-800 text-neutral-200 rounded-bl-none border border-neutral-700'
                        }`}
                      >
                        <p>{msg.content}</p>
                      </div>
                      <span className="text-[9px] text-neutral-500 mt-1 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            <div className="pt-3 border-t border-neutral-800 flex gap-2">
              <input
                type="text"
                placeholder="Type a direct message..."
                value={dmInputText}
                onChange={(e) => setDmInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendDirectMessage();
                }}
                className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={sendDirectMessage}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox Modal */}
      {showInboxModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 flex flex-col h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">Direct Messages Inbox</h3>
              </div>
              <button
                onClick={() => setShowInboxModal(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {allUserMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 space-y-2">
                  <MessageSquare className="w-8 h-8 text-neutral-700" />
                  <p className="text-xs">Your inbox is empty. Message community members from their shared tactical posts!</p>
                </div>
              ) : (
                allUserMessages.map((msg) => {
                  const isSender = msg.senderId === user?.uid;
                  const otherName = isSender ? msg.receiverName : msg.senderName;
                  const otherUid = isSender ? msg.receiverId : msg.senderId;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => {
                        setShowInboxModal(false);
                        openDirectMessage(otherUid, otherName);
                      }}
                      className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-emerald-500/50 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                          {otherName[0]?.toUpperCase() || 'U'}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-white">{otherName}</h4>
                          <p className="text-xs text-neutral-400 truncate max-w-[260px]">{msg.content}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-neutral-500">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-800">
              <button
                onClick={() => setShowInboxModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
              >
                Close Inbox
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
