import { useState, useEffect } from "react";
import { Plus, Edit, Trash, RotateCcw, Save, XCircle, Music } from "lucide-react";

interface Artist {
    id: number;
    name: string;
    status: number;
}

interface Album {
    id: number;
    name: string;
    status: number;
}

interface Song {
    id: number;
    name: string;
    artist: number;
    album: number | null;
    song_url?: string | null;
    duration: number;
    status: number;
    premium: number;
    lyrics: string;
}

interface SongFormData {
    title: string;
    artist: number | null;
    album: number | null;
    audio_file?: File | string | null;
    status: number;
    premium: number;
    lyrics: string;
}

export default function SongManager() {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [songs, setSongs] = useState<Song[]>([]);
    const [formData, setFormData] = useState<SongFormData>({
        title: "",
        artist: null,
        album: null,
        audio_file: null,
        status: 1,
        premium: 0,
        lyrics: "",
    });
    const [editingSongId, setEditingSongId] = useState<number | null>(null);
    const [audioPreview, setAudioPreview] = useState<string | null>(null);
    const [audioDuration, setAudioDuration] = useState<number>(1); // Default duration
    const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const BASE_URL = "http://127.0.0.1:8000";

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [artistsResponse, albumsResponse, songsResponse] = await Promise.all([
                    fetch(`${BASE_URL}/api/artists/`),
                    fetch(`${BASE_URL}/api/albums/`),
                    fetch(`${BASE_URL}/api/songs/`),
                ]);

                if (!artistsResponse.ok) throw new Error("Lỗi khi tải nghệ sĩ");
                if (!albumsResponse.ok) throw new Error("Lỗi khi tải album");
                if (!songsResponse.ok) throw new Error("Lỗi khi tải bài hát");

                const artistsData: Artist[] = await artistsResponse.json();
                const albumsData: Album[] = await albumsResponse.json();
                const songsData: any[] = await songsResponse.json();

                const normalizedSongs: Song[] = songsData.map(song => ({
                    id: song.id,
                    name: song.name || "Không xác định",
                    artist: song.artist || 0,
                    album: song.album || null,
                    song_url: song.song_url || null,
                    duration: song.duration || 1,
                    status: song.status ?? 1,
                    premium: song.premium !== undefined ? Number(song.premium) : 0,
                    lyrics: song.lyrics
                }));

                console.log("Raw Songs Data:", songsData);
                console.log("Normalized Songs:", normalizedSongs);

                setArtists(artistsData.filter((artist) => artist.status === 1));
                setAlbums(albumsData.filter((album) => album.status === 1));
                setSongs(normalizedSongs);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Lỗi không xác định khi tải dữ liệu.");
            }
        };
        fetchData();
    }, []);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "artist" || name === "album" || name === "premium"
                ? (value ? Number(value) : null) 
                : value,
        }));
    };

    const handleInputAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith("audio/") && file.type !== "video/mp4") {
                setError("Vui lòng chọn file âm thanh (mp3, wav, v.v.) hoặc video (mp4)!");
                return;
            }
            setFormData((prev) => ({ ...prev, audio_file: file }));
            setAudioPreview(URL.createObjectURL(file));

            // Calculate duration
            const media = file.type.startsWith("audio/") ? new Audio(URL.createObjectURL(file)) : new window.HTMLVideoElement();
            if (media instanceof HTMLAudioElement || media instanceof HTMLVideoElement) {
                media.addEventListener('loadedmetadata', () => {
                    const durationInSeconds = Math.floor(media.duration);
                    setAudioDuration(durationInSeconds);
                    if (media instanceof HTMLAudioElement) {
                        media.remove(); // Clean up for audio
                    }
                });
                if (media instanceof HTMLVideoElement) {
                    media.src = URL.createObjectURL(file);
                }
            }

            setError(null);
        }
    };

    const clearAudioFile = () => {
        setFormData((prev) => ({ ...prev, audio_file: null }));
        setAudioPreview(null);
        setAudioDuration(1); // Reset duration
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!formData.artist) {
            setError("Vui lòng chọn nghệ sĩ!");
            return;
        }
        if (!formData.audio_file && !editingSongId) {
            setError("Vui lòng chọn file âm thanh hoặc video!");
            return;
        }
        if (formData.premium === null || formData.premium === undefined) {
            setError("Vui lòng chọn loại bài hát (Premium hoặc Không Premium)!");
            return;
        }

        const url = editingSongId
            ? `${BASE_URL}/api/songs/update/${editingSongId}/`
            : `${BASE_URL}/api/songs/add/`;
        const method = editingSongId ? "PUT" : "POST";

        const formPayload = new FormData();
        formPayload.append("name", formData.title);
        formPayload.append("artist", String(formData.artist));
        if (formData.album !== null) {
            formPayload.append("album", String(formData.album));
        }
        formPayload.append("duration", String(audioDuration));
        formPayload.append("status", String(formData.status));
        formPayload.append("premium", String(formData.premium));
        formPayload.append("lyrics", formData.lyrics);
        if (formData.audio_file instanceof File) {
            formPayload.append("song", formData.audio_file);
        }

        try {
            const response = await fetch(url, {
                method,
                body: formPayload,
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Không thể lưu bài hát.");
            }

            const result: Song = await response.json();
            setSongs((prev) =>
                editingSongId
                    ? prev.map((song) => (song.id === result.id ? result : song))
                    : [...prev, result]
            );

            resetForm();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Lỗi không xác định khi lưu bài hát.");
        }
    };

    const resetForm = () => {
        setFormData({ title: "", artist: null, album: null, audio_file: null, status: 1, premium: 0, lyrics:"" });
        setEditingSongId(null);
        setAudioPreview(null);
        setAudioDuration(1);
        setIsFormVisible(false);
        setError(null);
    };

    const handleEdit = (song: Song) => {
        setFormData({
            title: song.name || "",
            artist: song.artist || null,
            album: song.album || null,
            audio_file: song.song_url || null,
            status: song.status ?? 1,
            premium: song.premium !== undefined ? song.premium : 0,
            lyrics: song.lyrics || "",
        });
        setEditingSongId(song.id);
        setAudioPreview(song.song_url ? `${BASE_URL}/audio/${song.song_url}` : null);
        setAudioDuration(song.duration);
        setIsFormVisible(true);
    };

    const toggleSongStatus = async (id: number, currentStatus: number) => {
        try {
            const response = await fetch(`${BASE_URL}/api/songs/change/${id}/`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: currentStatus === 1 ? 0 : 1 }),
            });

            if (!response.ok) {
                throw new Error("Không thể thay đổi trạng thái bài hát.");
            }

            const updatedSong = await response.json();
            setSongs((prev) =>
                prev.map((song) => (song.id === id ? updatedSong : song))
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Lỗi không xác định khi thay đổi trạng thái.");
        }
    };

    const getArtistName = (artistId: number) => {
        return artists.find((a) => a.id === artistId)?.name || "Không xác định";
    };

    const getAlbumName = (albumId: number | null) => {
        if (albumId === null) return "Không có album";
        return albums.find((a) => a.id === albumId)?.name || "Không xác định";
    };

    return (
        <div className="max-w-6xl mx-auto p-6 text-white">
            <header className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Music size={32} /> Quản lý bài hát
                </h1>
                <button
                    onClick={() => {
                        resetForm();
                        setIsFormVisible(true);
                    }}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 py-2 px-4 rounded-lg transition-colors"
                >
                    <Plus size={18} /> Thêm bài hát
                </button>
            </header>

            {error && (
                <div className="mb-6 p-4 bg-red-600/20 border border-red-600 rounded-lg text-red-200">
                    {error}
                </div>
            )}

            {isFormVisible && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-gray-900 p-6 rounded-xl w-full max-w-md shadow-lg">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            {editingSongId ? <Edit size={20} /> : <Plus size={20} />}
                            {editingSongId ? "Sửa bài hát" : "Thêm bài hát mới"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block mb-1 font-medium text-gray-300">Tên bài hát</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    placeholder="Nhập tên bài hát"
                                />
                            </div>

                            <div>
                                <label className="block mb-1 font-medium text-gray-300">Nghệ sĩ</label>
                                <select
                                    name="artist"
                                    value={formData.artist ?? ""}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                >
                                    <option value="" disabled>Chọn nghệ sĩ</option>
                                    {artists.map((artist) => (
                                        <option key={artist.id} value={artist.id}>
                                            {artist.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block mb-1 font-medium text-gray-300">Album</label>
                                <select
                                    name="album"
                                    value={formData.album ?? ""}
                                    onChange={handleInputChange}
                                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                >
                                    <option value="">Không có album</option>
                                    {albums.map((album) => (
                                        <option key={album.id} value={album.id}>
                                            {album.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block mb-1 font-medium text-gray-300">Loại bài hát</label>
                                <select
                                    name="premium"
                                    value={formData.premium}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                >
                                    <option value={0}>Không Premium</option>
                                    <option value={1}>Premium</option>
                                </select>
                            </div>

                            <div>
                                <label className="block mb-1 font-medium text-gray-300">Lời bài hát</label>
                                <textarea
                                    name="lyrics"
                                    value={formData.lyrics}
                                    onChange={handleInputAreaChange}
                                    required
                                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    placeholder="Nhập lời bài hát"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block mb-1 font-medium text-gray-300">File âm thanh hoặc video</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="audio/*,video/mp4"
                                        onChange={handleFileChange}
                                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white file:mr-4 file:py-1 file:px-3 file:bg-green-600 file:text-white file:rounded-md file:border-0 hover:file:bg-green-500"
                                    />
                                    {(audioPreview || (editingSongId && formData.audio_file)) && (
                                        <button
                                            type="button"
                                            onClick={clearAudioFile}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-300"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    )}
                                </div>
                                {editingSongId && typeof formData.audio_file === "string" && !audioPreview && (
                                    <p className="mt-2 text-gray-400">File hiện tại: {formData.audio_file}</p>
                                )}
                                {audioPreview && (
                                    <audio controls className="w-full mt-2">
                                        <source src={audioPreview} type={formData.audio_file instanceof File ? formData.audio_file.type : "audio/mpeg"} />
                                        Trình duyệt không hỗ trợ audio.
                                    </audio>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 py-2 rounded-lg transition-colors"
                                >
                                    {editingSongId ? <Save size={16} /> : <Plus size={16} />}
                                    {editingSongId ? "Lưu" : "Thêm"}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg transition-colors"
                                >
                                    <XCircle size={16} /> Hủy
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-gray-900 p-8 rounded-xl shadow-lg overflow-hidden">
                {songs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-gray-900 z-10">
                                <tr className="border-b text-gray-300 text-sm uppercase tracking-wider">
                                    <th className="p-5 w-16">Mã</th>
                                    <th className="p-5 w-1/4">Tên bài hát</th>
                                    <th className="p-5 w-1/5">Nghệ sĩ</th>
                                    <th className="p-5 w-1/5">Album</th>
                                    <th className="p-5 w-1/3">File âm thanh</th>
                                    <th className="p-5 w-24">Loại</th>
                                    <th className="p-5 w-24">Trạng thái</th>
                                    <th className="p-5 w-48 text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {songs.map((song) => (
                                    <tr
                                        key={song.id}
                                        className="transition-colors duration-200 hover:bg-gray-800/50"
                                    >
                                        <td className="p-5 text-gray-200 font-medium">{song.id}</td>
                                        <td className="p-5 text-gray-200">{song.name}</td>
                                        <td className="p-5 text-gray-200">{getArtistName(song.artist)}</td>
                                        <td className="p-5 text-gray-200">{getAlbumName(song.album)}</td>
                                        <td className="p-5">
                                            {song.song_url ? (
                                                <audio controls className="w-full max-w-[300px] h-10">
                                                    <source src={`${BASE_URL}/audio/${song.song_url}`} type="audio/mpeg" />
                                                </audio>
                                            ) : (
                                                <span className="text-gray-500 italic">Không có file</span>
                                            )}
                                        </td>
                                        <td className="p-5">
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                    song.premium === 1
                                                        ? "bg-blue-600/20 text-blue-400"
                                                        : "bg-gray-600/20 text-gray-400"
                                                }`}
                                            >
                                                {song.premium === 1 ? "Premium" : "Không Premium"}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                    song.status === 1
                                                        ? "bg-green-600/20 text-green-400"
                                                        : "bg-red-600/20 text-red-400"
                                                }`}
                                            >
                                                {song.status === 1 ? "Hoạt động" : "Đã xóa"}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex justify-center gap-4">
                                                <button
                                                    onClick={() => handleEdit(song)}
                                                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 py-1.5 px-4 rounded-lg text-sm font-medium transition-colors duration-200 shadow-md"
                                                >
                                                    <Edit size={14} /> Sửa
                                                </button>
                                                <button
                                                    onClick={() => toggleSongStatus(song.id, song.status)}
                                                    className={`flex items-center gap-1 py-1.5 px-4 rounded-lg text-sm font-medium transition-colors duration-200 shadow-md ${
                                                        song.status === 1
                                                            ? "bg-red-600 hover:bg-red-500"
                                                            : "bg-green-600 hover:bg-green-500"
                                                    }`}
                                                >
                                                    {song.status === 1 ? (
                                                        <>
                                                            <Trash size={14} /> Xóa
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RotateCcw size={14} /> Khôi phục
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-400 py-6 text-lg">Chưa có bài hát nào.</p>
                )}
            </div>
        </div>
    );
}