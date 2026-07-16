import React from "react";
import { Box, IconButton, Slider, Stack, Typography } from "@mui/material";
import { PauseRounded, PlayArrowRounded, SkipNextRounded, SkipPreviousRounded } from "@mui/icons-material";
import { usePlayer } from "./PlayerContext.jsx";

const clock = (value) => `${Math.floor((value || 0) / 60)}:${String(Math.floor((value || 0) % 60)).padStart(2, "0")}`;

export default function MiniPlayer() {
    const { track, playing, currentTime, duration, toggle, seek, previous, next } = usePlayer();
    if (!track.url) return null;
    return <Box component="aside" aria-label="Persistent audio mini player" sx={{ position:"fixed", left:{xs:10,md:24}, right:{xs:10,md:24}, bottom:12, zIndex:1400, p:{xs:1.25,md:1.6}, border:"1px solid rgba(103,232,249,.3)", borderRadius:4, bgcolor:"rgba(7,10,19,.94)", backdropFilter:"blur(22px)", boxShadow:"0 22px 60px rgba(0,0,0,.55)" }}>
        <Stack direction="row" alignItems="center" spacing={1.2}>
            <Box component="img" src={track.artwork || "/logo192.png"} alt="" sx={{width:46,height:46,borderRadius:2,objectFit:"cover"}} />
            <Box sx={{minWidth:0,width:{xs:110,sm:210}}}><Typography fontWeight={900} noWrap>{track.title}</Typography><Typography variant="caption" color="text.secondary" noWrap>{track.artist}</Typography></Box>
            <IconButton aria-label="Previous track" onClick={previous}><SkipPreviousRounded /></IconButton>
            <IconButton aria-label={playing ? "Pause" : "Play"} onClick={toggle} sx={{bgcolor:"primary.main",color:"#061018","&:hover":{bgcolor:"#a5f3fc"}}}>{playing ? <PauseRounded /> : <PlayArrowRounded />}</IconButton>
            <IconButton aria-label="Next track" onClick={next}><SkipNextRounded /></IconButton>
            <Slider aria-label="Playback position" value={Math.min(currentTime,duration||0)} max={duration||1} onChange={(_,v)=>seek(v)} sx={{flex:1,minWidth:60}} />
            <Typography variant="caption" sx={{display:{xs:"none",sm:"block"}}}>{clock(currentTime)} / {clock(duration)}</Typography>
        </Stack>
    </Box>;
}
