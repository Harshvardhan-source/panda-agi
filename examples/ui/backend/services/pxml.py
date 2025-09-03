from ast import Tuple
from typing import Callable, Optional
from services.files import FilesService
from panda_agi.envs.base_env import BaseEnv
from pxml import DashboardCompiler
import logging

logger = logging.getLogger(__name__)


class PXMLService:

    @staticmethod
    async def compile(
        xml_content: str, get_file: Callable[[str, Optional[dict]], Tuple[bytes, str]]
    ) -> str:
        """
        Compile a PXML file and return the compiled html file
        """
        try:
            dashboard_compiler = DashboardCompiler()
            dashboard_data = dashboard_compiler.xml_parser.parse(xml_content)

            csv_file_path = dashboard_data["metadata"].file_path

            file_bytes, _ = await get_file(csv_file_path)
            csv_content = file_bytes.decode("utf-8")
            html_content = dashboard_compiler.compile_dashboard_with_csv(
                dashboard_data, csv_content
            )
            logger.info(f"TEST DEBUG: HTML content: {html_content[:100]}")
            return html_content
        except Exception as e:
            logger.exception(f"Error compiling PXML file: {e}")
            raise Exception(f"Failed to compile PXML file")

    @staticmethod
    async def compile_pxml(xml_content: str, env: BaseEnv) -> str:
        """
        Compile a PXML file and return the compiled data.
        """
        try:

            async def get_file(file_path: str) -> Tuple[bytes, str]:
                return await FilesService.get_file_from_env(file_path, env)

            return PXMLService.compile(xml_content, get_file)
        except Exception as e:
            logger.exception(f"Error compiling PXML file: {e}")
            raise Exception(f"Failed to compile PXML file")

    @staticmethod
    async def get_csv_files_for_pxml(xml_content: str, env: BaseEnv):
        """
        Get CSV files referenced in PXML content and yield (content, filepath) tuples.
        """
        try:
            dashboard_compiler = DashboardCompiler()
            dashboard_data = dashboard_compiler.xml_parser.parse(xml_content)

            csv_file_path = dashboard_data["metadata"].file_path

            # Get the CSV file content
            csv_content_bytes, _ = await FilesService.get_file_from_env(
                csv_file_path, env
            )

            # Yield the CSV content and filepath
            yield csv_content_bytes, csv_file_path

        except Exception as e:
            logger.exception(f"Error getting CSV files for PXML: {e}")
            raise Exception(f"Failed to get CSV files for PXML")
