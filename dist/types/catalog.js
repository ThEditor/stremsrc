"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTmdbMovie = isTmdbMovie;
exports.isTmdbSeries = isTmdbSeries;
// Type guards
function isTmdbMovie(meta) {
    return meta.type === 'movie';
}
function isTmdbSeries(meta) {
    return meta.type === 'tv';
}
