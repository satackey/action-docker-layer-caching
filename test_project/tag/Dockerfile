FROM alpine AS data
RUN date > /now1.txt
RUN date > /now2.txt
RUN date > /now3.txt

FROM scratch
COPY --from=data /now3.txt /data_stage_built_at.txt
