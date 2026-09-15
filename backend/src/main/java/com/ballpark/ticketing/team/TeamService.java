package com.ballpark.ticketing.team;

import java.util.List;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.global.config.CacheNames;
import com.ballpark.ticketing.team.dto.TeamResponse;

@Service
@Transactional(readOnly = true)
public class TeamService {

    private final TeamRepository teamRepository;

    public TeamService(TeamRepository teamRepository) {
        this.teamRepository = teamRepository;
    }

    @Cacheable(cacheNames = CacheNames.TEAMS, key = "'all'")
    public List<TeamResponse> getTeams() {
        return teamRepository.findAllWithStadium().stream()
                .map(TeamResponse::from)
                .toList();
    }
}
