FROM alpine AS data
RUN date > /now.txt

FROM scratch
COPY --from=data /now.txt /data_stage_built_at.txt
